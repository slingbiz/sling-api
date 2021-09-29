const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { pageRoutesService } = require('../services');

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getRoutes = catchAsync(async (req, res) => {
  const { query, page, size } = req.body;
  const { clientId } = req;

  const routesList = await pageRoutesService.getRoutes({ page, size, query, clientId });
  res.status(httpStatus.OK).send({ routesList });
});

module.exports = {
  ping,
  getRoutes,
};
