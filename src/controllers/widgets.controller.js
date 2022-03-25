const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { widgetsService } = require('../services');

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getWidgets = catchAsync(async (req, res) => {
  console.log(req.query);
  const { query, page, size, widgetType } = req.query;
  const { clientId } = req;

  const widgets = await widgetsService.getWidgets(widgetType);
  res.status(httpStatus.OK).send({ widgets });
});

const createWidget = catchAsync(async (req, res) => {
  const widget = await widgetsService.createWidget(req.body);
  res.status(httpStatus.CREATED).send({ widget });
});

const updateWidget = catchAsync(async (req, res) => {
  console.log(req.body);
  const widgets = await widgetsService.updateWidget(req.body.id, req.body.widget);
  res.status(httpStatus.CREATED).send(widgets);
});

module.exports = {
  ping,
  getWidgets,
  createWidget,
  updateWidget,
};
