const httpStatus = require('http-status');
// const { Account } = require('../models');
const fs = require('fs');
const path = require('path');
const Account = require('../models/account.model');
const ApiError = require('../utils/ApiError');
const { CLIENT_VERIFICATION_STEPS } = require('../constants/common');
const { getDb } = require('../utils/mongoInit');
const { ensureFirstRunHome } = require('../utils/ensureFirstRunHome');
const { filterDemoCatalogDocs } = require('../utils/skipDemoCatalog');
const {
  getTenantSlugCandidate,
  formatTenantSlugWithAttempt,
  resolvePersistedClientUrl,
} = require('../utils/tenantSlug');

const UNIQUE_TENANT_SLUG_MAX_ATTEMPTS = 200;

async function allocateUniqueTenantSlug(AccountModel, ownerUserRef, candidateBase) {
  const baseSlug = candidateBase || getTenantSlugCandidate({});

  for (let attempt = 0; attempt < UNIQUE_TENANT_SLUG_MAX_ATTEMPTS; attempt += 1) {
    const label = formatTenantSlugWithAttempt(baseSlug, attempt);
    // eslint-disable-next-line no-await-in-loop
    const existing = await AccountModel.findOne({ tenantSlug: label }).select('user');

    if (!existing || String(existing.user) === String(ownerUserRef)) return label;
  }

  throw new ApiError(
    httpStatus.CONFLICT,
    'Could not allocate a unique preview subdomain slug; retry or contact support.',
  );
}

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
    const existing = await Account.findOne(query);

    const baseSlug = getTenantSlugCandidate({
      companyName: existing?.companyName,
      orgName: existing?.orgName,
      email: existing?.email,
    });

    const tenantSlug = existing?.tenantSlug
      ? existing.tenantSlug
      : await allocateUniqueTenantSlug(Account, user, baseSlug);

    const clientUrl = resolvePersistedClientUrl(formData.clientUrl, tenantSlug);

    const company = await Account.findOneAndUpdate(
      query,
      { ...formData, tenantSlug, clientUrl, verificationStep },
      { new: true },
    );
    return company;
  } catch (e) {
    console.log('Error in CompanyKeyCodeSetup [account.service]: ', e.message);
    if (e instanceof ApiError) throw e;
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
          const keep = filterDemoCatalogDocs(collectionName, [data]);
          if (!keep.length) {
            continue;
          }
          await db.collection(collectionName).insertOne(keep[0]);
        }
      } catch (e) {
        console.log('Error executing query: ', query, e.message);
      }
    }
  }
};

const clonePublicIfEmpty = async (db, collectionName, clientId, addedOn) => {
  const existing = await db.collection(collectionName).countDocuments({
    client_id: clientId,
    ownership: 'private',
  });
  if (existing > 0) {
    return;
  }
  const publicDocs = await db.collection(collectionName).find({ ownership: 'public' }).project({ _id: 0 }).toArray();
  const keep = filterDemoCatalogDocs(collectionName, publicDocs);
  if (!keep.length) {
    return;
  }
  await db.collection(collectionName).insertMany(
    keep.map((element) => ({
      ...element,
      client_id: clientId,
      ownership: 'private',
      added_on: addedOn,
      updated_on: addedOn,
    })),
  );
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

    const addedOn = new Date();
    try {
      await clonePublicIfEmpty(db, 'widgets', clientId, addedOn);
    } catch (e) {
      console.log('Error in CompanyInitialSetup [widgets setup - account.service]: ', e.message);
    }

    try {
      await clonePublicIfEmpty(db, 'layout_config', clientId, addedOn);
    } catch (e) {
      console.log('Error in CompanyInitialSetup [layout setup - account.service]: ', e.message);
    }

    try {
      await clonePublicIfEmpty(db, 'page_routes', clientId, addedOn);
    } catch (e) {
      console.log('Error in CompanyInitialSetup [routes setup - account.service]: ', e.message);
    }

    try {
      await clonePublicIfEmpty(db, 'api_meta', clientId, addedOn);
    } catch (e) {
      console.log('Error in CompanyInitialSetup [api setup - account.service]: ', e.message);
    }

    await ensureFirstRunHome(db, clientId);

    // New workspaces start with an empty gallery. Do not clone public media or media_constants.
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
