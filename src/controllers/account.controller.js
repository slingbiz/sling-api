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
  const form = await CompanyRegistration({ ...req.body, apiKey }, req.clientId);
  res.status(httpStatus.CREATED).send(form);
});
const CompanyMembershipForm = catchAsync(async (req, res) => {
  const form = await CompanyMembership(req.clientId, req.body.packageType);
  res.status(httpStatus.CREATED).send(form);
});
const CompanyKeyCodeSetupForm = catchAsync(async (req, res) => {
  const form = await CompanyKeyCodeSetup(req.clientId, req.body.data);
  res.status(httpStatus.CREATED).send(form);
});
const UpdateCompanyInformation = catchAsync(async (req, res) => {
  const form = await ModifyCompanyInformation(req.clientId, req.body.formData);
  res.status(httpStatus.CREATED).send(form);
});
const UpdateStoreInformation = catchAsync(async (req, res) => {
  const form = await ModifyStoreInformation(req.clientId, req.body.formData);
  res.status(httpStatus.CREATED).send(form);
});
const GetCompanyInformation = catchAsync(async (req, res) => {
  const form = await FetchCompanyInformation(req.clientId);
  res.status(httpStatus.OK).send(form);
});

module.exports = {
  CompanyRegistrationForm,
  CompanyMembershipForm,
  CompanyKeyCodeSetupForm,
  GetCompanyInformation,
  UpdateCompanyInformation,
  UpdateStoreInformation,
};
