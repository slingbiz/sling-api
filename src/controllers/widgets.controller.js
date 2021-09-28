const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { widgetsService } = require('../services');

const ping = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send('pong');
});

const getWidgets = catchAsync(async (req, res) => {
  const { query, page, size } = req.body;
  const { clientId } = req;
  console.log('clientIDclientIDclientIDclientID', clientId);

  const widgets = await widgetsService.getWidgets({ page, size, query, clientId });
  res.status(httpStatus.OK).send({ widgets });
});

module.exports = {
  ping,
  getWidgets,
};
