const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const initConfigData = require('../constants/initConfig');
const clientService = require('../services/client.service');

const ping = catchAsync(async (req, res) => {
  // await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.OK).send('pong');
});

const initConfig = catchAsync(async (req, res) => {
  const layoutConfig = await clientService.getInitConfig();
  res.status(httpStatus.OK).send({ initConfigData, layoutConfig });
});

const setConfig = catchAsync(async (req, res) => {
  const setRes = await clientService.setInitConfig(req.body);
  res.status(httpStatus.OK).send(setRes);
});

module.exports = {
  ping,
  initConfig,
  setConfig,
};
