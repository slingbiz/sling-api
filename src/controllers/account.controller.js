const httpStatus = require('http-status');
const { CompanyRegistration, CompanyMembership, CompanyKeyCodeSetup } = require('../services/account.service');
const catchAsync = require('../utils/catchAsync');

const CompanyRegistrationForm = catchAsync(async (req, res) => {
  const form1 = await CompanyRegistration({ ...req.body });
  res.status(httpStatus.CREATED).send({ form1 });
});
const CompanyMembershipForm = catchAsync(async (req, res) => {
  const email = req.user?.email;
  const form2 = await CompanyMembership(email, req.body.packageType);
  res.status(httpStatus.CREATED).send({ form2 });
});
const CompanyKeyCodeSetupForm = catchAsync(async (req, res) => {
  const email = req.user?.email;
  const form3 = await CompanyKeyCodeSetup(email, req.body.data);
  res.status(httpStatus.CREATED).send({ form3 });
});

module.exports = {
  CompanyRegistrationForm,
  CompanyMembershipForm,
  CompanyKeyCodeSetupForm,
};
