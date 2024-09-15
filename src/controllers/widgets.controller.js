const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { widgetsService } = require('../services');

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getWidgets = catchAsync(async (req, res) => {
  const { query, page, size, type } = req.body;
  const { clientId } = req;
  const widgets = await widgetsService.getWidgets({ query, page, size, type, clientId });
  res.status(httpStatus.OK).send({ widgets });
});

const createWidget = catchAsync(async (req, res) => {
  const widget = await widgetsService.createWidget(req.body, req.clientId);
  res.status(httpStatus.CREATED).send({ widget });
});

const updateWidget = catchAsync(async (req, res) => {
  const widgets = await widgetsService.updateWidget(req.body.id, req.body.widget, req.clientId);
  res.status(httpStatus.CREATED).send(widgets);
});

const updateWidgetByKey = catchAsync(async (req, res) => {
  const widgets = await widgetsService.updateWidgetByKey(req.body.key, req.body.widget, req.clientId);
  res.status(httpStatus.CREATED).send(widgets);
});
module.exports = {
  ping,
  getWidgets,
  createWidget,
  updateWidget,
  updateWidgetByKey,
};
