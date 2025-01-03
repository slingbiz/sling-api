const httpStatus = require('http-status');
const axios = require('axios');
const ApiError = require('../utils/ApiError');
const { GLOBAL_SLING_HANDLER } = require('../constants/common');
const { getDb } = require('../utils/mongoInit');

/**
 * Returns initial config to create the page layout.
 * @param userId
 * @returns {Promise<*|number>}
 */
const getInitConfig = async ({ clientId = 'demo-id' } = {}) => {
  // Get Db
  const db = getDb();
  let layoutConfig = {};

  try {
    layoutConfig = await db.collection('layout_config').find({ client_id: clientId }).toArray();
  } catch (e) {
    throw new ApiError(httpStatus['500'], 'Something bad happened while fetching the config');
  }
  return layoutConfig?.[0]?.config || 0;
};

// TODO make it configurable after login in the sling dashboard.
const setInitConfig = async (reqBody, clientId = 'demo-id') => {
  const { pageKey, root = {}, meta = {}, isNewRecord } = reqBody;
  const db = getDb();
  const setObj = {};
  if (Object.keys(root).length) {
    setObj[`config.${pageKey}.root`] = root;
  }
  if (Object.keys(meta).length) {
    setObj[`config.${pageKey}.meta`] = meta;
  }
  let saveRes = {};
  try {
    // TODO: Fetch user info from auth middleware after checking roles and permissions.
    // TODO: Pass user info in request body.

    if (isNewRecord) {
      const templateExist = await db
        .collection('layout_config')
        .find({
          client_id: clientId,
          [`config.${pageKey}`]: { $exists: true },
        })
        .toArray();

      if (templateExist?.length) {
        return { status: false, msg: `Page Layout (${pageKey}) already exists` };
      }
    }
    await db.collection('layout_config').updateOne({ client_id: clientId }, { $set: setObj }, { upsert: true });
    saveRes = { status: true, msg: 'Layout updated successfully' };
  } catch (e) {
    saveRes = { status: false, msg: e.message };
  }
  return saveRes;
};

/**
 * Delete page template
 */
const deletePageTemplate = async ({ pageKey }, clientId = 'demo-id') => {
  const db = getDb();
  let deleteRes = {};
  try {
    await db.collection('layout_config').updateOne({ client_id: clientId }, { $unset: { [`config.${pageKey}`]: '' } });
    deleteRes = { status: true, msg: 'Layout deleted successfully' };
  } catch (e) {
    deleteRes = { status: false, msg: e.message };
  }
  return deleteRes;
};

const getSSRApiRes = async ({ pathname, clientId }) => {
  if (!GLOBAL_SLING_HANDLER.includes(pathname)) {
    return {};
  }
  const db = getDb();

  // Find api list based on route page template
  const ssrApis = await db.collection('api_meta').find({ client_id: clientId, ssr: true }).toArray();

  const axiosPromiseArr = [];
  const apiRetResponse = {};
  const responseKeyMapper = {};

  // Todo: Pass headers, and request body from params;
  ssrApis.forEach((v, k) => {
    const { url, unique_id_fe: uniqueIdFe } = v;
    responseKeyMapper[k] = uniqueIdFe;
    axiosPromiseArr.push(axios.get(url));
  });

  const axiosRes = await Promise.all(axiosPromiseArr);

  axiosRes.forEach((apiResponse, k) => {
    apiRetResponse[responseKeyMapper[k]] = apiResponse.data;
  });
  return apiRetResponse;
};

const getRouteConstants = () => {};

module.exports = {
  getInitConfig,
  setInitConfig,
  deletePageTemplate,
  getSSRApiRes,
  getRouteConstants,
};
