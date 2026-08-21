const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { WidgetStatus } = require('../constants/appEnums');

const { widgetsService, widgetGenerateService } = require('../services');

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getWidgets = catchAsync(async (req, res) => {
  const { query, page, size, type } = req.body;
  const { clientId } = req;
  const widgets = await widgetsService.getWidgets({ query, page, size, type, clientId });
  res.status(httpStatus.OK).send({ widgets });
});

// Used by the public-facing frontend's widget registry fetch only (never
// Studio). Unlike getWidgets above, this always forces status: published so
// a draft, pending-review, or rejected AI-generated widget's metadata can
// never leak into a live site's registry just because it shares the same
// Widget collection as everything else.
const getPublishedWidgets = catchAsync(async (req, res) => {
  const { query, page, size, type } = req.body;
  const { clientId } = req;
  const widgets = await widgetsService.getWidgets({
    query,
    page,
    size,
    type,
    clientId,
    status: WidgetStatus.PUBLISHED,
  });
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

const deleteWidget = catchAsync(async (req, res) => {
  const widgets = await widgetsService.deleteWidget(req.body.id, req.clientId);
  res.status(httpStatus.CREATED).send(widgets);
});

const submitWidgetForReview = catchAsync(async (req, res) => {
  const widget = await widgetsService.submitWidgetForReview(req.params.widgetId, req.clientId);
  res.status(httpStatus.OK).send({ widget });
});

const reviewWidget = catchAsync(async (req, res) => {
  const { action, notes } = req.body;
  const widget = await widgetsService.reviewWidget(req.params.widgetId, { action, notes }, req.clientId, req.user.id);
  res.status(httpStatus.OK).send({ widget });
});

const publishWidget = catchAsync(async (req, res) => {
  const widget = await widgetsService.publishWidget(req.params.widgetId, req.clientId);
  res.status(httpStatus.OK).send({ widget });
});

const generateWidget = catchAsync(async (req, res) => {
  const { prompt, themeConfig } = req.body;
  const generated = await widgetGenerateService.generateWidget(prompt, themeConfig);

  const widget = await widgetsService.createWidget(
    {
      ...generated,
      ownership: 'private',
      source: 'ai_generated',
      status: 'draft',
      generationPrompt: prompt,
    },
    req.clientId
  );

  res.status(httpStatus.CREATED).send({ widget });
});

module.exports = {
  ping,
  getWidgets,
  getPublishedWidgets,
  createWidget,
  updateWidget,
  updateWidgetByKey,
  deleteWidget,
  submitWidgetForReview,
  reviewWidget,
  publishWidget,
  generateWidget,
};
