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

  console.log(clientId, '[clientId]');
  try {
    layoutConfig = await db.collection('layout_config').find({ client_id: clientId }).toArray();
    console.log(clientId, 'clientIdclientId@client.service.js', layoutConfig);
  } catch (e) {
    console.log(e.message, '[getInitConfig] Service');
    throw new ApiError(httpStatus['500'], 'Something bad happened while fetching the config');
  }
  return layoutConfig?.[0]?.config || 0;
};

// TODO make it configurable after login in the sling dashboard.
const setInitConfig = async (reqBody, clientId = 'demo-id') => {
  console.log(reqBody, '@setInitConfig reqBody', clientId);
  const { pageKey, root, meta, isNewRecord } = reqBody;
  const db = getDb();
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
    await db
      .collection('layout_config')
      .updateOne({ client_id: clientId }, { $set: { [`config.${pageKey}`]: { root, meta } } }, { upsert: true });
    saveRes = { status: true, msg: 'Layout updated successfully' };
  } catch (e) {
    console.log(e.message, '[setInitConfig] Service');
    saveRes = { status: false, msg: e.message };
  }
  return saveRes;
};

const getSSRApiRes = async ({ asPath, query, pathname, clientId }) => {
  if (pathname !== GLOBAL_SLING_HANDLER) {
    return {};
  }
  const db = getDb();

  // Find api list based on route page template
  const ssrApis = await db.collection('api_meta').find({ client_id: clientId, ssr: true }).toArray();
  // console.log(ssrApis, '@ssrapis');

  const axiosPromiseArr = [];
  const apiRetResponse = {};
  const responseKeyMapper = {};

  // Todo: Pass headers, and request body from params;
  ssrApis.forEach((v, k) => {
    const { url, type, headers, params, unique_id_fe: uniqueIdFe } = v;
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
  getSSRApiRes,
  getRouteConstants,
};
