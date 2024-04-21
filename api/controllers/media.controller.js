const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const mediaService = require('../services/media.service');

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getMedia = catchAsync(async (req, res) => {
  const { query, page, size } = req.body;
  const { clientId } = req;

  const media = await mediaService.getMedia({ page, size, query, clientId });
  res.status(httpStatus.OK).send({ media });
});

const getMediaConstants = catchAsync(async (req, res) => {
  const { query, page, size } = req.body;
  const { clientId } = req;

  const mediaConstants = await mediaService.getMediaConstants({ page, size, query, clientId });
  res.status(httpStatus.OK).send({ media: mediaConstants });
});

module.exports = {
  ping,
  getMedia,
  getMediaConstants,
};
