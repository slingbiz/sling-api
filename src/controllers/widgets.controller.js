const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { WidgetStatus } = require('../constants/appEnums');

const { widgetsService, widgetGenerateService, themeService, auditService, widgetVersionService } = require('../services');

const writeAudit = async (req, action, resourceType, resourceId, metadata) => {
  try {
    const actor = auditService.actorFromUser(req.user);
    await auditService.write({
      clientId: req.clientId,
      actorUserId: actor.actorUserId,
      action,
      resourceType,
      resourceId,
      metadata: {
        ...(metadata || {}),
        ...(actor.actorName ? { actorName: actor.actorName } : {}),
        ...(actor.actorEmail ? { actorEmail: actor.actorEmail } : {}),
      },
    });
  } catch (error) {
    // A successful widget write must not become a 500 because audit failed.
  }
};

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getWidgets = catchAsync(async (req, res) => {
  const { query, page, size, type, status } = req.body;
  const { clientId } = req;
  const result = await widgetsService.getWidgets({ query, page, size, type, clientId, status });
  res.status(httpStatus.OK).send(result);
});

// Used by the public-facing frontend's widget registry fetch only (never
// Studio). Unlike getWidgets above, this always forces status: published so
// a draft, pending-review, or rejected AI-generated widget's metadata can
// never leak into a live site's registry just because it shares the same
// Widget collection as everything else.
const getPublishedWidgets = catchAsync(async (req, res) => {
  const { query, page, size, type } = req.body;
  const { clientId } = req;
  const result = await widgetsService.getWidgets({
    query,
    page,
    size,
    type,
    clientId,
    status: WidgetStatus.PUBLISHED,
  });
  res.status(httpStatus.OK).send(result);
});

const createWidget = catchAsync(async (req, res) => {
  const widget = await widgetsService.createWidget(req.body, req.clientId, req.user && req.user.id);
  await writeAudit(req, 'widget.save', 'widget', widget._id, { key: widget.key, source: widget.source });
  res.status(httpStatus.CREATED).send({ widget });
});

const updateWidget = catchAsync(async (req, res) => {
  const widgets = await widgetsService.updateWidget(req.body.id, req.body.widget, req.clientId, req.user && req.user.id);
  await writeAudit(req, 'widget.update', 'widget', req.body.id, {
    key: req.body.widget && req.body.widget.key,
  });
  res.status(httpStatus.CREATED).send(widgets);
});

const updateWidgetByKey = catchAsync(async (req, res) => {
  const widgets = await widgetsService.updateWidgetByKey(req.body.key, req.body.widget, req.clientId, req.user && req.user.id);
  await writeAudit(req, 'widget.update', 'widget', widgets && widgets._id, {
    key: req.body.key,
  });
  res.status(httpStatus.CREATED).send(widgets);
});

const deleteWidget = catchAsync(async (req, res) => {
  const widgets = await widgetsService.deleteWidget(req.body.id, req.clientId);
  res.status(httpStatus.CREATED).send(widgets);
});

const submitWidgetForReview = catchAsync(async (req, res) => {
  const widget = await widgetsService.submitWidgetForReview(req.params.widgetId, req.clientId, req.user && req.user.id);
  await writeAudit(req, 'widget.submit_review', 'widget', widget._id, { key: widget.key });
  res.status(httpStatus.OK).send({ widget });
});

const reviewWidget = catchAsync(async (req, res) => {
  const { action, notes } = req.body;
  const widget = await widgetsService.reviewWidget(req.params.widgetId, { action, notes }, req.clientId, req.user.id);
  await writeAudit(req, action === 'approve' ? 'widget.approve' : 'widget.reject', 'widget', widget._id, {
    key: widget.key,
    notes,
  });
  res.status(httpStatus.OK).send({ widget });
});

const publishWidget = catchAsync(async (req, res) => {
  const widget = await widgetsService.publishWidget(req.params.widgetId, req.clientId, req.user && req.user.id);
  await writeAudit(req, 'widget.publish', 'widget', widget._id, { key: widget.key });
  res.status(httpStatus.OK).send({ widget });
});

const generateWidget = catchAsync(async (req, res) => {
  const { prompt, themeConfig } = req.body;
  const resolvedTheme = themeConfig || (await themeService.getTheme(req.clientId)).theme;
  const generated = await widgetGenerateService.generateWidget(prompt, resolvedTheme);

  const widget = await widgetsService.createWidget(
    {
      ...generated,
      ownership: 'private',
      source: 'ai_generated',
      status: 'draft',
      generationPrompt: prompt,
    },
    req.clientId,
    req.user && req.user.id
  );

  await writeAudit(req, 'widget.generate', 'widget', widget._id, { key: widget.key });
  await writeAudit(req, 'widget.save', 'widget', widget._id, { key: widget.key, source: widget.source });

  res.status(httpStatus.CREATED).send({ widget });
});

const listWidgetVersions = catchAsync(async (req, res) => {
  const { page, size } = req.query;
  const result = await widgetVersionService.listVersions({
    widgetId: req.params.widgetId,
    clientId: req.clientId,
    page,
    size,
  });
  res.status(httpStatus.OK).send(result);
});

const getWidgetVersion = catchAsync(async (req, res) => {
  const result = await widgetVersionService.getVersion({
    widgetId: req.params.widgetId,
    versionId: req.params.versionId,
    clientId: req.clientId,
  });
  res.status(httpStatus.OK).send(result);
});

const revertWidgetVersion = catchAsync(async (req, res) => {
  const widget = await widgetVersionService.revert({
    widgetId: req.params.widgetId,
    versionId: req.params.versionId,
    clientId: req.clientId,
    actorUserId: req.user && req.user.id,
  });
  await writeAudit(req, 'widget.revert', 'widget', widget._id, {
    key: widget.key,
    version: widget.version,
  });
  res.status(httpStatus.OK).send({ widget });
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
  listWidgetVersions,
  getWidgetVersion,
  revertWidgetVersion,
};
