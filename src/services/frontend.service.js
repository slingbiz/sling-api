const httpStatus = require('http-status');
const axios = require('axios');
const UrlPattern = require('url-pattern');
const ApiError = require('../utils/ApiError');
const { GLOBAL_SLING_HANDLER } = require('../constants/common');
const { getDb } = require('../utils/mongoInit');

/**
 * Returns initial config to create the page layout.
 * @param userId
 * @returns {Promise<*|number>}
 */
const getLayout = async ({ clientId = 'demo-id' }) => {
  // Get Db
  const db = getDb();
  let layoutConfig = {};

  // TODO: Use pageTemplate to get exactly relevant page node;

  try {
    layoutConfig = await db.collection('layout_config').find({ client_id: clientId }).toArray();
  } catch (e) {
    console.log(e.message, '[getLayout] Service');
    throw new ApiError(httpStatus['500'], 'Something bad happened while fetching the config');
  }
  return layoutConfig?.[0]?.config || 0;
};

const setInitConfig = async (reqBody) => {
  console.log(reqBody, '@setInitConfig reqBody');
  const { pageKey, root } = reqBody;
  const db = getDb();
  let saveRes = {};
  try {
    // TODO: Fetch user info from auth middleware after checking roles and permissions.
    // TODO: Pass user info in request body.
    await db.collection('layout_config').updateOne({ user_id: 'demo' }, { $set: { [`config.${pageKey}`]: { root } } });
    saveRes = { status: true, msg: 'Layout updated successfully' };
  } catch (e) {
    console.log(e.message, '[setInitConfig] Service');
    saveRes = { status: false, msg: e.message };
  }
  return saveRes;
};

const getSSRApiRes = async ({ pathname, clientId }) => {
  if (pathname !== GLOBAL_SLING_HANDLER) {
    return {};
  }
  const db = getDb();

  // Find api list based on route page template
  const ssrApis = await db
    .collection('api_meta')
    .find({ client_id: clientId, ssr: true })
    .project({ url: 1, type: 1, headers: 1, params: 1, body: 1, unique_id_fe: 1, sling_mapping: 1 })
    .toArray();
  // console.log(ssrApis, '@ssrapis');

  const axiosPromiseArr = [];
  const apiRetResponse = {};
  const responseKeyMapper = {};

  // Todo: Pass headers, and request body from params;
  ssrApis.forEach((v, k) => {
    const { url, type, body, unique_id_fe: uniqueIdFe, sling_mapping: slingMapping } = v;
    responseKeyMapper[k] = uniqueIdFe;
    apiRetResponse[uniqueIdFe] = { ...apiRetResponse[uniqueIdFe], sling_mapping: slingMapping };
    if (type === 'GET') {
      axiosPromiseArr.push(axios.get(url));
    }
    if (type === 'POST') {
      axiosPromiseArr.push(axios.post(url, body));
    }
  });

  const axiosRes = await Promise.all(axiosPromiseArr);

  axiosRes.forEach((apiResponse, k) => {
    const { data } = apiResponse;
    const currRetApiRes = apiRetResponse[responseKeyMapper[k]];
    apiRetResponse[responseKeyMapper[k]] = { ...currRetApiRes, data };
  });

  return apiRetResponse;
};

const getRouteConstants = () => {};

const removeTrailingSlash = (str) => {
  return str.replace(/\/$/, '');
};

// Utility function to convert URL string to regex pattern
function convertToRegexPattern(urlString) {
  return `^${urlString.replace(/<([^>]+)>/g, '([^/]+)').replace(/\//g, '\\/')}$`;
}

const getMatchingRoute = async ({ asPath, query, clientId }) => {
  console.log(asPath, query, '--aspath--query', clientId);
  const db = getDb();

  // TODO: Cache this response.
  const allRoutes = await db.collection('page_routes').find({ client_id: clientId }).toArray();

  let routeRet = {};

  // Iterate over all routes and attempt to match the asPath
  for (const routeObj of allRoutes) {
    const { url_string: urlString, keys } = routeObj;

    // Clean URL string
    const cleanedUrlString = removeTrailingSlash(urlString);

    // Determine if the route is static or dynamic
    const isDynamic = keys && keys.length > 0;

    // Create the appropriate pattern
    const regexPattern = isDynamic
      ? new RegExp(convertToRegexPattern(cleanedUrlString))
      : new RegExp(`^/${cleanedUrlString}$`);

    // Clean asPath
    const cleanedAsPath = `/${removeTrailingSlash(asPath.replace(/^\//, ''))}`;

    // Attempt to match the pattern
    const matchRes = cleanedAsPath.match(regexPattern);

    // Debugging logs
    console.log('Route Object:', routeObj);
    console.log('Original urlString:', urlString);
    console.log('Cleaned urlString:', cleanedUrlString);
    console.log('Regex Pattern:', regexPattern);
    console.log('Cleaned asPath:', cleanedAsPath);
    console.log('Match Result:', matchRes);
    console.log('Keys:', keys);
    console.log('Match Keys Length:', matchRes ? matchRes.length - 1 : 0); // Subtract 1 to exclude the full match

    // Check if matchRes is valid and matches the keys length
    if (matchRes && matchRes.length - 1 === keys.length) {
      routeRet = routeObj;
      break;
    }
  }

  return routeRet;
};

module.exports = {
  getLayout,
  setInitConfig,
  getSSRApiRes,
  getRouteConstants,
  getMatchingRoute,
};
