const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const initConfigData = require('../constants/initConfig');
const frontendService = require('../services/frontend.service');
const { GLOBAL_SLING_HANDLER } = require('../constants/common');

const ping = catchAsync(async (req, res) => {
  // await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.OK).send('pong');
});

/**
 * To be called in the _app.js getInitialProps for the frontend.
 * @type {function(...[*]=)}
 */
const getInitProps = catchAsync(async (req, res) => {
  const { pathname, query, asPath } = req.body;
  const { clientId } = req;
  console.log(clientId, '[getInitProps] ClientID');
  if (pathname !== GLOBAL_SLING_HANDLER) {
    console.log('[getInitProps] Not a part of global sling handler. - ', asPath);
    res
      .status(httpStatus.OK)
      .send({ initConfig: initConfigData, layoutConfig: {}, routeConstants: [], apiResponse: {}, pageTemplate: '' });
    return;
  }

  // Todo call all async using Promise.All

  // Get Page Template Type & Constants from route
  const matchingRoute = await frontendService.getMatchingRoute({ asPath, query, clientId });

  if (matchingRoute && !Object.keys(matchingRoute)?.length) {
    res
      .status(httpStatus.OK)
      .send({ initConfig: initConfigData, layoutConfig: {}, routeConstants: [], apiResponse: {}, pageTemplate: '' });
    console.log('[getInitProps] No matching route found in Global Sling Handler. - ', asPath);
    // console.log(initConfigData);
    return;
  }
  const { page_template: pageTemplate } = matchingRoute;
  const layoutConfig = await frontendService.getLayout({ asPath, query, clientId, pageTemplate });

  // Get initial api requests set in the dashboard.
  // Fetch response, set in a custom object.
  const apiResponse = await frontendService.getSSRApiRes({ asPath, query, pathname, clientId, pageTemplate });
  // get RouteConstants with global constants
  const routeConstants = await frontendService.getRouteConstants();

  res.status(httpStatus.OK).send({ initConfig: initConfigData, layoutConfig, routeConstants, apiResponse, pageTemplate });
});

module.exports = {
  ping,
  getInitProps,
};
