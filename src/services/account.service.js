const httpStatus = require('http-status');
// const { Account } = require('../models');
const Account = require('../models/account.model');
const ApiError = require('../utils/ApiError');
const { CLIENT_VERIFICATION_STEPS } = require('../constants/common');
const { getDb } = require('../utils/mongoInit');

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

const CompanyInitialSetup = async (clientId) => {
  const db = getDb();
  try {
    const widgetPublic = await db.collection('widgets').find({ ownership: 'public' }).project({ _id: 0 }).toArray();
    const addedOn = new Date();
    const updatedOn = new Date();
    try {
      await db.collection('widgets').insertMany(
        widgetPublic.map((element) => ({
          ...element,
          client_id: clientId,
          ownership: 'private',
          added_on: addedOn,
          updated_on: updatedOn,
        }))
      );
    } catch (e) {
      console.log('Error in CompanyInitialSetup [widgets setup - account.service]: ', e.message);
    }

    try {
      const layoutPublic = await db.collection('layout_config').find({ ownership: 'public' }).project({ _id: 0 }).toArray();
      await db.collection('layout_config').insertMany(
        layoutPublic.map((element) => ({
          ...element,
          ownership: 'private',
          client_id: clientId,
          added_on: addedOn,
          updated_on: updatedOn,
        }))
      );
    } catch (e) {
      console.log('Error in CompanyInitialSetup [layout setup - account.service]: ', e.message);
    }

    const routePublic = await db.collection('page_routes').find({ ownership: 'public' }).project({ _id: 0 }).toArray();
    try {
      await db.collection('page_routes').insertMany(
        routePublic.map((element) => ({
          ...element,
          client_id: clientId,
          ownership: 'private',
          added_on: addedOn,
          updated_on: updatedOn,
        }))
      );
    } catch (e) {
      console.log('Error in CompanyInitialSetup [routes setup - account.service]: ', e.message);
    }

    const apiPublic = await db.collection('api_meta').find({ ownership: 'public' }).project({ _id: 0 }).toArray();
    try {
      await db.collection('api_meta').insertMany(
        apiPublic.map((element) => ({
          ...element,
          client_id: clientId,
          ownership: 'private',
          added_on: addedOn,
          updated_on: updatedOn,
        }))
      );
    } catch (e) {
      console.log('Error in CompanyInitialSetup [api setup - account.service]: ', e.message);
    }
  } catch (e) {
    console.log('Error in CompanyInitialSetup [account.service]: ', e.message);
  }
};

module.exports = {
  CompanyRegistration,
  CompanyMembership,
  CompanyKeyCodeSetup,
  FetchCompanyInformation,
  ModifyCompanyInformation,
  ModifyStoreInformation,
  CompanyInitialSetup,
};
