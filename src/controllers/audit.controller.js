const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const auditService = require('../services/audit.service');

const listAudit = catchAsync(async (req, res) => {
  const { page, size } = req.query;
  const result = await auditService.list({ clientId: req.clientId, page, size });
  res.status(httpStatus.OK).send(result);
});

module.exports = {
  listAudit,
};
