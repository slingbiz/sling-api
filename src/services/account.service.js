const httpStatus = require('http-status');
// const { Account } = require('../models');
const Account = require('../models/account.model');
const ApiError = require('../utils/ApiError');
const { CLIENT_VERIFICATION_STEPS } = require('../constants/common');

const CompanyRegistration = async (formData, user) => {
  if (await Account.isEmailTaken(formData.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${formData.email} Email already taken`);
  }
  try {
    const verificationStep = CLIENT_VERIFICATION_STEPS.COMPANY_REGISTERED;
    const company = await Account.create({ ...formData, verificationStep, user });
    return company;
  } catch (e) {
    console.log('Error in CompanyRegistration [account.service]: ', e.message);
  }
};

const CompanyMembership = async (user, data) => {
  const query = { user };
  const verificationStep = CLIENT_VERIFICATION_STEPS.MEMBERSHIP_SELECTED;
  try {
    const company = await Account.findOneAndUpdate(query, { packageType: data, verificationStep }, { new: true });
    return company;
  } catch (e) {
    console.log('Error in CompanyMembership [account.service]: ', e.message);
  }
};

const CompanyKeyCodeSetup = async (user, formData) => {
  const query = { user };
  const verificationStep = CLIENT_VERIFICATION_STEPS.COMPLETED;
  try {
    const company = await Account.findOneAndUpdate(query, { ...formData, verificationStep }, { new: true });
    console.log(company);
    return company;
  } catch (e) {
    console.log('Error in CompanyKeyCodeSetup [account.service]: ', e.message);
  }
};

const ModifyCompanyInformation = async (user, formData) => {
  try {
    const company = await Account.findOneAndUpdate({ user }, formData, { new: true });
    return company;
  } catch (e) {
    console.log('Error in ModifyCompanyInformation [account.service]: ', e.message);
  }
};

const ModifyStoreInformation = async (user, formData) => {
  try {
    const company = await Account.findOneAndUpdate({ user }, formData, { new: true });
    return company;
  } catch (e) {
    console.log('Error in ModifyStoreInformation [account.service]: ', e.message);
  }
};

const FetchCompanyInformation = async (user) => {
  try {
    const company = await Account.findOne({ user });
    return company;
  } catch (e) {
    console.log('Error in FetchCompanyInformation [account.service]: ', e.message);
  }
};

module.exports = {
  CompanyRegistration,
  CompanyMembership,
  CompanyKeyCodeSetup,
  FetchCompanyInformation,
  ModifyCompanyInformation,
  ModifyStoreInformation,
};
