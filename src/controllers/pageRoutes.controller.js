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

const saveRoute = catchAsync(async (req, res) => {
  const { clientId } = req;

  const response = await pageRoutesService.saveRoute({ req, clientId });
  res.status(httpStatus.OK).send({ response });
});

// Delete route
const deleteRoute = catchAsync(async (req, res) => {
  const { clientId } = req;
  const response = await pageRoutesService.deleteRoute({ req, clientId });
  res.status(httpStatus.OK).send({ response });
});

// Update Route
const updateRoute = catchAsync(async (req, res) => {
  const { clientId } = req;
  const response = await pageRoutesService.updateRoute({ req, clientId });
  res.status(httpStatus.OK).send({ response });
});
module.exports = {
  ping,
  getRoutes,
  saveRoute,
  deleteRoute,
  updateRoute
};
