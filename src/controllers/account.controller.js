const httpStatus = require('http-status');
const {
  CompanyRegistration,
  CompanyMembership,
  CompanyKeyCodeSetup,
  FetchCompanyInformation,
  ModifyCompanyInformation,
  ModifyStoreInformation,
} = require('../services/account.service');
const catchAsync = require('../utils/catchAsync');
const { tokenService } = require('../services');

const CompanyRegistrationForm = catchAsync(async (req, res) => {
  const apiKey = tokenService.generateApiToken(req.clientId);
  const form = await CompanyRegistration({ ...req.body, apiKey });
  res.status(httpStatus.CREATED).send(form);
});
const CompanyMembershipForm = catchAsync(async (req, res) => {
  const email = req.user?.email;
  const form = await CompanyMembership(email, req.body.packageType);
  res.status(httpStatus.CREATED).send(form);
});
const CompanyKeyCodeSetupForm = catchAsync(async (req, res) => {
  const email = req.user?.email;
  const form = await CompanyKeyCodeSetup(email, req.body.data);
  res.status(httpStatus.CREATED).send(form);
});
const UpdateCompanyInformation = catchAsync(async (req, res) => {
  const form = await ModifyCompanyInformation(req.body.id, req.body.formData);
  res.status(httpStatus.CREATED).send(form);
});
const UpdateStoreInformation = catchAsync(async (req, res) => {
  const form = await ModifyStoreInformation(req.body.id, req.body.formData);
  res.status(httpStatus.CREATED).send(form);
});
const GetCompanyInformation = catchAsync(async (req, res) => {
  const email = req.user?.email;
  const form = await FetchCompanyInformation(email);
  res.status(httpStatus.CREATED).send(form);
});

module.exports = {
  CompanyRegistrationForm,
  CompanyMembershipForm,
  CompanyKeyCodeSetupForm,
  GetCompanyInformation,
  UpdateCompanyInformation,
  UpdateStoreInformation,
};
