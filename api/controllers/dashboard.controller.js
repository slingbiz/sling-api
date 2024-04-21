const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const initConfigData = require('../constants/initConfig');
const clientService = require('../services/client.service');

const ping = catchAsync(async (req, res) => {
  // await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.OK).send('pong');
});

const initConfig = catchAsync(async (req, res) => {
  const { clientId } = req;
  const layoutConfig = await clientService.getInitConfig({ clientId });
  res.status(httpStatus.OK).send({ initConfigData, layoutConfig });
});

const getTemplates = catchAsync(async (req, res) => {
  const { clientId } = req;
  const layoutConfig = await clientService.getInitConfig({ clientId });
  const templates = Object.keys(layoutConfig || {});
  res.status(httpStatus.OK).send({ templates });
});

/**
 * To be called in the _app.js getInitialProps for the frontend.
 * @type {function(...[*]=)}
 */
const getInitProps = catchAsync(async (req, res) => {
  const { pathname, query, asPath } = req.body;
  const { clientId } = req;

  // Todo call all async using Promise.All

  // Get Page Template Type & Constants from route

  const layoutConfig = await clientService.getInitConfig({ asPath, query, clientId });

  // Get initial api requests set in the dashboard.
  // Fetch response, set in a custom object.
  const apiResponse = await clientService.getSSRApiRes({ asPath, query, pathname, clientId });
  // get RouteConstants with global constants
  const routeConstants = await clientService.getRouteConstants();

  res.status(httpStatus.OK).send({ initConfigData, layoutConfig, routeConstants, apiResponse });
});

const setConfig = catchAsync(async (req, res) => {
  const { clientId } = req;
  const setRes = await clientService.setInitConfig(req.body, clientId);
  res.status(httpStatus.OK).send(setRes);
});

// To Delete Page Template
const deletePageTemplate = catchAsync(async (req, res) => {
  const { clientId } = req;
  const deleteRes = await clientService.deletePageTemplate(req.body, clientId);
  res.status(httpStatus.OK).send(deleteRes);
});

module.exports = {
  ping,
  initConfig,
  deletePageTemplate,
  getInitProps,
  setConfig,
  getTemplates,
};
