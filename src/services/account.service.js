const httpStatus = require('http-status');
// const { Account } = require('../models');
const Account = require('../models/account.model');
const ApiError = require('../utils/ApiError');
const { CLIENT_VERIFICATION_STEPS } = require('../constants/common');

const CompanyRegistration = async (formData) => {
  if (await Account.isEmailTaken(formData.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${formData.email} Email already taken`);
  }
  try {
    const verificationStep = CLIENT_VERIFICATION_STEPS.COMPANY_REGISTERED;
    const company = await Account.create({ ...formData, verificationStep });
    return company;
  } catch (e) {
    console.log('Error in CompanyRegistration [account.service]: ', e.message);
  }
};

const CompanyMembership = async (email, data) => {
  const query = { email };
  const verificationStep = CLIENT_VERIFICATION_STEPS.MEMBERSHIP_SELECTED;
  try {
    const company = await Account.findOneAndUpdate(query, { packageType: data, verificationStep }, { new: true });
    return company;
  } catch (e) {
    console.log('Error in CompanyMembership [account.service]: ', e.message);
  }
};

const CompanyKeyCodeSetup = async (email, formData) => {
  const query = { email };
  const verificationStep = CLIENT_VERIFICATION_STEPS.COMPLETED;
  try {
    const company = await Account.findOneAndUpdate(query, { ...formData, verificationStep }, { new: true });
    return company;
  } catch (e) {
    console.log('Error in CompanyKeyCodeSetup [account.service]: ', e.message);
  }
};

const ModifyCompanyInformation = async (id, formData) => {
  try {
    const company = await Account.findOneAndUpdate({ id }, formData, { new: true });
    return company;
  } catch (e) {
    console.log('Error in CompanyKeyCodeSetup [account.service]: ', e.message);
  }
};

const FetchCompanyInformation = async (email) => {
  try {
    const company = await Account.findOne({ email });
    return company;
  } catch (e) {
    console.log('Error in CompanyKeyCodeSetup [account.service]: ', e.message);
  }
};

module.exports = {
  CompanyRegistration,
  CompanyMembership,
  CompanyKeyCodeSetup,
  FetchCompanyInformation,
  ModifyCompanyInformation,
};
