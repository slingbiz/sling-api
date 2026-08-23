const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const themeService = require('../services/theme.service');

const getTheme = catchAsync(async (req, res) => {
  const theme = await themeService.getTheme(req.clientId);
  res.status(httpStatus.OK).send(theme);
});

const setTheme = catchAsync(async (req, res) => {
  const theme = await themeService.saveTheme(req.clientId, req.body);
  res.status(httpStatus.OK).send(theme);
});

module.exports = {
  getTheme,
  setTheme,
};
