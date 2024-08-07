const httpStatus = require('http-status');
// const { Account } = require('../models');
const fs = require('fs');
const path = require('path');
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

// Function to import public data from the init_data.js file
const importPublicData = async (db) => {
  const scriptPath = path.resolve(__dirname, '../scripts/init_data.js');

  if (!fs.existsSync(scriptPath)) {
    console.log('Error: init_data.js file does not exist at path:', scriptPath);
    return;
  }

  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  const queries = scriptContent.split('\n');

  for (const query of queries) {
    if (query.trim()) {
      try {
        // Extract collection name and data from the query
        const match = query.match(/db\.(\w+)\.insert\((.*)\);/);
        if (match) {
          const collectionName = match[1];
          const data = JSON.parse(match[2]);
          await db.collection(collectionName).insertOne(data);
        }
      } catch (e) {
        console.log('Error executing query: ', query, e.message);
      }
    }
  }
};

const CompanyInitialSetup = async (clientId) => {
  const db = getDb();
  try {
    // Check if public data exist for major collections
    const widgetPublicCount = await db.collection('widgets').countDocuments({ ownership: 'public' });
    const layoutPublicCount = await db.collection('layout_config').countDocuments({ ownership: 'public' });
    const routePublicCount = await db.collection('page_routes').countDocuments({ ownership: 'public' });

    if (widgetPublicCount === 0 || layoutPublicCount === 0 || routePublicCount === 0) {
      // Import public data
      await importPublicData(db);
    }

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

    const mediaPublic = await db.collection('media').find({ ownership: 'public' }).project({ _id: 0 }).toArray();
    try {
      await db.collection('media').insertMany(
        mediaPublic.map((element) => ({
          ...element,
          client_id: clientId,
          ownership: 'private',
          added_on: addedOn,
          updated_on: updatedOn,
        }))
      );
    } catch (e) {
      console.log('Error in CompanyInitialSetup [media setup - account.service]: ', e.message);
    }

    const mediaConstantsPublic = await db
      .collection('media_constants')
      .find({ ownership: 'public' })
      .project({ _id: 0 })
      .toArray();
    try {
      await db.collection('media_constants').insertMany(
        mediaConstantsPublic.map((element) => ({
          ...element,
          client_id: clientId,
          ownership: 'private',
          added_on: addedOn,
          updated_on: updatedOn,
        }))
      );
    } catch (e) {
      console.log('Error in CompanyInitialSetup [media_constants setup - account.service]: ', e.message);
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
