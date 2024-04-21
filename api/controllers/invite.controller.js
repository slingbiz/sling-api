const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const inviteService = require('../services/invite.service');

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const signMeUp = catchAsync(async (req, res) => {
  const resService = await inviteService.signMeUp(req.body);
  res.status(httpStatus.OK).send(resService);
});

module.exports = {
  ping,
  signMeUp,
};
