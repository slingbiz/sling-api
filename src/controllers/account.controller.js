const httpStatus = require('http-status');
const { CompanyRegistration, CompanyMembership, CompanyKeyCodeSetup } = require('../services/account.service');
const catchAsync = require('../utils/catchAsync');

const CompanyRegistrationForm = catchAsync(async (req, res) => {
  const form1 = await CompanyRegistration({ ...req.body });
  res.status(httpStatus.CREATED).send({ form1 });
});
const CompanyMembershipForm = catchAsync(async (req, res) => {
  const form2 = await CompanyMembership(req.body.id, req.body.packageType);
  res.status(httpStatus.CREATED).send({ form2 });
});
const CompanyKeyCodeSetupForm = catchAsync(async (req, res) => {
  const form3 = await CompanyKeyCodeSetup(req.body.id, req.body.data);
  res.status(httpStatus.CREATED).send({ form3 });
});

module.exports = {
  CompanyRegistrationForm,
  CompanyMembershipForm,
  CompanyKeyCodeSetupForm,
};
