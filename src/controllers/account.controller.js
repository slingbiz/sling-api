const httpStatus = require('http-status');
const {
  accountForm1Registration,
  accountForm2Registration,
  accountForm3Registration,
} = require('../services/account.service');
const catchAsync = require('../utils/catchAsync');

const accountForm1 = catchAsync(async (req, res) => {
  const form1 = await accountForm1Registration({ ...req.body });
  res.status(httpStatus.CREATED).send({ form1 });
});
const accountForm2 = catchAsync(async (req, res) => {
  const form2 = await accountForm2Registration(req.body.id, req.body.packageType);
  res.status(httpStatus.CREATED).send({ form2 });
});
const accountForm3 = catchAsync(async (req, res) => {
  const form3 = await accountForm3Registration(req.body.id, req.body.data);
  res.status(httpStatus.CREATED).send({ form3 });
});

module.exports = {
  accountForm1,
  accountForm2,
  accountForm3,
};
