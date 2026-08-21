const httpStatus = require('http-status');
const { Widget } = require('../models');
const ApiError = require('../utils/ApiError');
const { WidgetStatus, WidgetSource } = require('../constants/appEnums');
const githubPublishService = require('./githubPublish.service');

const { getDb } = require('../utils/mongoInit');

const findTenantWidget = async (id, clientId) => {
  const widget = await Widget.findOne({ _id: id, client_id: clientId });
  if (!widget) {
    throw new ApiError(httpStatus.NOT_FOUND, `Widget not found: ${id}`);
  }
  return widget;
};

const createWidget = async (widgetBody, clientId) => {
  if (await Widget.isKeyTaken(widgetBody.key, widgetBody.type, clientId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Widget Key already taken, Key: ${widgetBody.key}`);
  }
  try {
    const widget = await Widget.create({ ...widgetBody, client_id: clientId });
    return widget;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong. Message: ${error.message}`);
  }
};

// const getWidgets = async (widgetType) => {
//   const widgets = await Widget.find({ type: widgetType });
//   return { widgets, tc: widgets.length };
// };

const getWidgets = async ({ page = 0, size = 50, query, clientId, type, status }) => {
  const db = getDb();
  const skip = page * size;
  const andArray = [];

  // Add type filter if provided
  if (type) {
    andArray.push({ type });
  }

  // Optional: filter by governance status (e.g. 'pending_review' for a
  // review queue). Omitted entirely when not provided, so existing callers
  // that don't pass status keep seeing exactly what they see today.
  if (status) {
    andArray.push({ status });
  }

  // Add query filter if provided
  if (query) {
    const cond = {
      $regex: query,
      $options: 'i', // case-insensitive search
    };
    andArray.push({
      $or: [{ name: cond }, { description: cond }, { sku: cond }],
    });
  }

  // Filter by private ownership and client_id
  andArray.push({ ownership: 'private', client_id: clientId });

  // Fetch widgets sorted by _id in descending order
  const widgetsRes = await db
    .collection('widgets')
    .find({ $and: andArray })
    .sort({ _id: -1 }) // Sort by _id descending
    .skip(skip)
    .limit(size)
    .toArray();

  // Get the total count of widgets
  const totalRes = await db.collection('widgets').countDocuments({ $and: andArray });

  return { widgets: widgetsRes, tc: totalRes };
};

const updateWidget = async (id, widgetBody, clientId) => {
  const widget = await Widget.findByIdAndUpdate(
    id,
    widgetBody,
    { new: true, upsert: true } // new: true returns the updated document, upsert: true creates a new document if none exists
  );

  if (!widget) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong ${widget}`);
  }
  try {
    const widgets = await getWidgets({ type: widget.type, clientId });
    return widgets;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong. Message: ${error.message}`);
  }
};

const updateWidgetByKey = async (key, widgetBody, clientId) => {
  let widget;
  try {
    widget = await Widget.findOneAndUpdate(
      { key, client_id: clientId },
      { $set: { ...widgetBody } },
      { new: true, upsert: false } // new: true returns the updated document, upsert: true creates a new document if none exists
    );
  } catch (err) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Something went wrong in updating the Widget with Key ${key}. Error: ${err.message}`
    );
  }

  if (!widget) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong in updating the Widget with Key ${key}`);
  }
  return widget;
};

const deleteWidget = async (id, clientId) => {
  const widget = await Widget.findByIdAndDelete(id);
  if (!widget) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Widget with id ${id} not found`);
  }
  try {
    const widgets = await getWidgets({ type: widget.type, clientId });
    return widgets;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong. Message: ${error.message}`);
  }
};

// Draft or previously-rejected widgets can be (re)submitted for review.
// Anything already in-flight or already published must go through its own
// dedicated action instead (review / publish) rather than being resubmitted.
const submitWidgetForReview = async (id, clientId) => {
  const widget = await findTenantWidget(id, clientId);
  if (![WidgetStatus.DRAFT, WidgetStatus.REJECTED].includes(widget.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Widget cannot be submitted for review from status "${widget.status}"`);
  }
  widget.status = WidgetStatus.PENDING_REVIEW;
  await widget.save();
  return widget;
};

// Approve or reject a widget that's pending review. Restricted to the
// 'reviewWidgets' right (admins) at the route level — this function still
// enforces the status precondition so it can't be used to short-circuit the
// workflow even if called directly.
const reviewWidget = async (id, { action, notes }, clientId, reviewerId) => {
  const widget = await findTenantWidget(id, clientId);
  if (widget.status !== WidgetStatus.PENDING_REVIEW) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Widget is not pending review (current status: "${widget.status}")`);
  }
  widget.status = action === 'approve' ? WidgetStatus.APPROVED : WidgetStatus.REJECTED;
  widget.review = { reviewedBy: reviewerId, reviewedAt: new Date(), notes };
  await widget.save();
  return widget;
};

// Only an approved widget can go live. This is the step that actually makes
// an AI-generated widget available for use, kept separate from approval so
// "reviewed and okay" and "is now live" stay distinct, audited events.
//
// For AI-generated widgets, the git write happens BEFORE the DB status
// flips to published, not after: if the commit to sling-fe fails, the
// widget must stay "approved" (safely retriable) rather than the DB
// claiming "published" while no file actually landed in the repo. Manual
// widgets skip the git step entirely — their code already lives in
// sling-fe by hand, publish is just the status flip it always was.
const publishWidget = async (id, clientId) => {
  const widget = await findTenantWidget(id, clientId);
  if (widget.status !== WidgetStatus.APPROVED) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Widget must be approved before it can be published (current status: "${widget.status}")`
    );
  }

  if (widget.source === WidgetSource.AI_GENERATED) {
    const otherPublishedAiWidgets = await Widget.find({
      source: WidgetSource.AI_GENERATED,
      status: WidgetStatus.PUBLISHED,
      _id: { $ne: widget._id },
    });

    try {
      await githubPublishService.publishGeneratedWidgetToRepo(widget, [...otherPublishedAiWidgets, widget]);
    } catch (error) {
      throw new ApiError(httpStatus.BAD_GATEWAY, `Failed to publish widget to sling-fe: ${error.message}`);
    }
  }

  widget.status = WidgetStatus.PUBLISHED;
  widget.publishedAt = new Date();
  await widget.save();
  return widget;
};

module.exports = {
  getWidgets,
  createWidget,
  updateWidget,
  updateWidgetByKey,
  deleteWidget,
  submitWidgetForReview,
  reviewWidget,
  publishWidget,
};
