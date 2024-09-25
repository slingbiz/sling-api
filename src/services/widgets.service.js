const httpStatus = require('http-status');
const { Widget } = require('../models');
const ApiError = require('../utils/ApiError');

const { getDb } = require('../utils/mongoInit');

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

const getWidgets = async ({ page = 0, size = 50, query, clientId, type }) => {
  const db = getDb();
  const skip = page * size;
  const andArray = [];

  // Add type filter if provided
  if (type) {
    andArray.push({ type });
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

module.exports = {
  getWidgets,
  createWidget,
  updateWidget,
  updateWidgetByKey,
};
