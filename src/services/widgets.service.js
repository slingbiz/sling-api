const httpStatus = require('http-status');
const { Widget } = require('../models');
const ApiError = require('../utils/ApiError');
const { WidgetStatus, WidgetSource } = require('../constants/appEnums');
const githubPublishService = require('./githubPublish.service');
const { checkCodePolicy } = require('./codePolicy.service');

const { getDb } = require('../utils/mongoInit');

const requireClientId = (clientId) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
};

const policyError = (violations) => {
  const first = (violations && violations[0] && violations[0].message) || 'code failed governance policy';
  return new ApiError(httpStatus.BAD_REQUEST, `Widget failed governance policy: ${first}`);
};

const applyCodePolicy = (widgetBody = {}) => {
  if (widgetBody.code == null && !widgetBody.dependencies) {
    return { allowed: true, violations: widgetBody.policyViolations || [] };
  }
  const policy = checkCodePolicy(widgetBody.code || '', widgetBody.dependencies);
  return policy;
};

const findTenantWidget = async (id, clientId) => {
  requireClientId(clientId);
  const widget = await Widget.findOne({ _id: id, client_id: clientId });
  if (!widget) {
    throw new ApiError(httpStatus.NOT_FOUND, `Widget not found: ${id}`);
  }
  return widget;
};

const sanitizeWidgetKey = (raw) => {
  const cleaned = String(raw || 'Widget')
    .replace(/[^A-Za-z0-9_]/g, '')
    .replace(/^[0-9]/, 'W$&');
  return cleaned || 'Widget';
};

// AI retries reuse the same key (e.g. LoginForm). For this tenant only:
// update the existing AI draft, otherwise suffix so a published/manual
// widget is never overwritten and other tenants are never touched.
const resolveWidgetKey = async (widgetBody, clientId) => {
  const type = widgetBody.type || 'widget';
  const base = sanitizeWidgetKey(widgetBody.key);
  const existing = await Widget.findOne({ key: base, client_id: clientId, type });

  if (!existing) {
    return { key: base };
  }

  const isAiDraft =
    widgetBody.source === WidgetSource.AI_GENERATED &&
    existing.source === WidgetSource.AI_GENERATED &&
    existing.status === WidgetStatus.DRAFT;

  if (isAiDraft) {
    return { key: base, existingId: existing._id };
  }

  for (let i = 2; i < 200; i += 1) {
    const candidate = `${base}${i}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await Widget.isKeyTaken(candidate, type, clientId))) {
      return { key: candidate };
    }
  }

  return { key: `${base}_${Date.now().toString(36)}` };
};

const createWidget = async (widgetBody, clientId) => {
  requireClientId(clientId);
  const incomingStatus = widgetBody.status;
  const policy = applyCodePolicy(widgetBody);
  if (!policy.allowed && incomingStatus === WidgetStatus.PUBLISHED) {
    throw policyError(policy.violations);
  }
  const nextBody = {
    ...widgetBody,
    policyViolations: policy.violations,
    client_id: clientId,
  };
  if (nextBody.source === WidgetSource.AI_GENERATED) {
    nextBody.status = WidgetStatus.DRAFT;
  }
  const { key, existingId } = await resolveWidgetKey(nextBody, clientId);
  try {
    if (existingId) {
      const widget = await Widget.findOneAndUpdate(
        { _id: existingId, client_id: clientId },
        { ...nextBody, key, client_id: clientId },
        { new: true }
      );
      if (!widget) {
        throw new ApiError(httpStatus.NOT_FOUND, `Widget not found: ${existingId}`);
      }
      return widget;
    }
    return await Widget.create({ ...nextBody, key, client_id: clientId });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong. Message: ${error.message}`);
  }
};

// const getWidgets = async (widgetType) => {
//   const widgets = await Widget.find({ type: widgetType });
//   return { widgets, tc: widgets.length };
// };

const getWidgets = async ({ page = 0, size = 50, query, clientId, type, status }) => {
  requireClientId(clientId);
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
  requireClientId(clientId);
  if (widgetBody && widgetBody.status === WidgetStatus.PUBLISHED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Widget must be approved before it can be published');
  }
  const existing = await findTenantWidget(id, clientId);
  const policy = applyCodePolicy(widgetBody || {});
  if (!policy.allowed && existing.status === WidgetStatus.PUBLISHED) {
    throw policyError(policy.violations);
  }
  const nextBody = widgetBody && widgetBody.code != null ? { ...widgetBody, policyViolations: policy.violations } : widgetBody;
  const widget = await Widget.findOneAndUpdate({ _id: id, client_id: clientId }, nextBody, {
    new: true,
    upsert: false,
  });

  if (!widget) {
    throw new ApiError(httpStatus.NOT_FOUND, `Widget not found: ${id}`);
  }
  try {
    const widgets = await getWidgets({ type: widget.type, clientId });
    return widgets;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong. Message: ${error.message}`);
  }
};

const updateWidgetByKey = async (key, widgetBody, clientId) => {
  requireClientId(clientId);
  if (widgetBody && widgetBody.status === WidgetStatus.PUBLISHED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Widget must be approved before it can be published');
  }
  const existing = await Widget.findOne({ key, client_id: clientId });
  if (!existing) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Something went wrong in updating the Widget with Key ${key}`);
  }
  const policy = applyCodePolicy(widgetBody || {});
  if (!policy.allowed && existing.status === WidgetStatus.PUBLISHED) {
    throw policyError(policy.violations);
  }
  const nextBody =
    widgetBody && widgetBody.code != null ? { ...widgetBody, policyViolations: policy.violations } : widgetBody;
  let widget;
  try {
    widget = await Widget.findOneAndUpdate(
      { key, client_id: clientId },
      { $set: { ...nextBody } },
      { new: true, upsert: false }
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
  requireClientId(clientId);
  const widget = await Widget.findOneAndDelete({ _id: id, client_id: clientId });
  if (!widget) {
    throw new ApiError(httpStatus.NOT_FOUND, `Widget with id ${id} not found`);
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
  const policy = checkCodePolicy(widget.code || '', widget.dependencies);
  widget.policyViolations = policy.violations;
  if (!policy.allowed) {
    throw policyError(policy.violations);
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

  const policy = checkCodePolicy(widget.code || '', widget.dependencies);
  widget.policyViolations = policy.violations;
  if (!policy.allowed) {
    throw policyError(policy.violations);
  }

  if (widget.source === WidgetSource.AI_GENERATED) {
    const otherPublishedAiWidgets = await Widget.find({
      source: WidgetSource.AI_GENERATED,
      status: WidgetStatus.PUBLISHED,
      client_id: clientId,
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
