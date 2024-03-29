const httpStatus = require('http-status');
const { ObjectID } = require('mongodb');
const { Widget } = require('../models');
const ApiError = require('../utils/ApiError');

const { getDb } = require('../utils/mongoInit');

const createWidget = async (widgetBody, clientId) => {
  if (await Widget.isTitleTaken(widgetBody.name, widgetBody.type, clientId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Widget name already taken');
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

const getWidgets = async ({ page = 0, size = 10, query, clientId, type }) => {
  // await sleep(5000);
  const db = getDb();
  const skip = page * size;
  const andArray = [];
  if (type) {
    andArray.push({ type });
  }
  if (query) {
    const cond = {
      $regex: query,
      $options: 'i',
    };
    andArray.push({
      $or: [
        {
          name: cond,
        },
        {
          description: cond,
        },
        {
          sku: cond,
        },
      ],
    });
  }
  // Get all public
  // const orArray = [{ ownership: 'public' }];

  // Or private for the client
  andArray.push({ ownership: 'private', client_id: clientId });

  // or protected and bought subscriptions;
  // get all subscriptions

  // const subscriptionsRes = await db.collection('widget_subscriptions').find({ client_id: clientId }).toArray();
  // const widgetsSubscribed = subscriptionsRes?.[0]?.subscriptions;
  // if (widgetsSubscribed?.length) {
  //   const oids = [];
  //   widgetsSubscribed.forEach(function (item) {
  //     oids.push(new ObjectID(item));
  //   });
  //   orArray.push({ ownership: 'protected', _id: { $in: oids } });
  // }
  // andArray.push({ $or: orArray });

  // TODO: Cache this response.
  console.log(JSON.stringify(andArray), 'andArrayandArray');
  // Get widgets and total count
  const widgetsRes = await db.collection('widgets').find({ $and: andArray }).skip(skip).limit(size).toArray();
  const totalRes = await db.collection('widgets').count({ $and: andArray });
  return { widgets: widgetsRes, tc: totalRes };
};

const updateWidget = async (id, widgetBody, clientId) => {
  const widget = await Widget.findByIdAndUpdate(id, widgetBody);

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
module.exports = {
  getWidgets,
  createWidget,
  updateWidget,
};
