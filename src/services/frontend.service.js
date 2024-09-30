/* eslint-disable no-restricted-syntax */
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

// // Utility function to convert URL string to regex pattern
// function convertToRegexPattern(urlString) {
//   return `^${urlString.replace(/<([^>]+)>/g, '([^/]+)').replace(/\//g, '\\/')}$`;
// }

const getMatchingRoute = async ({ asPath, query, clientId }) => {
  console.log(asPath, query, '--aspath--query', clientId);
  const db = getDb();

  // Fetch all routes for the client
  const allRoutes = await db.collection('page_routes').find({ client_id: clientId }).toArray();

  let routeRet = {};

  // Helper function to clean the URL string and path
  const cleanUrl = (url) => {
    return url.trim().replace(/^\/+|\/+$/g, '');
  };

  // Helper function to convert dynamic URL to regex
  const convertToRegexPattern = (urlString) => {
    // Replace dynamic segments like <city>, <l1Category>, <l2Category> with regex capturing groups
    return urlString.replace(/<[^>]+>/g, '([^/]+)');
  };

  // Clean the asPath for comparison
  const cleanedAsPath = `/${cleanUrl(asPath)}`;

  // Iterate over all routes and attempt to match the asPath
  for (const routeObj of allRoutes) {
    const { url_string: urlString, keys = [] } = routeObj;

    // Clean the route URL
    const cleanedUrlString = cleanUrl(urlString);

    // Determine if the route is dynamic based on the keys
    const isDynamic = keys.length > 0;

    // Generate the regex pattern for dynamic or static routes
    const regexPattern = isDynamic
      ? new RegExp(`^/${convertToRegexPattern(cleanedUrlString)}$`)
      : new RegExp(`^/${cleanedUrlString}$`);

    console.log('Converting URL to Regex:', urlString, ' -> ', regexPattern);

    // Attempt to match the cleaned asPath with the regex pattern
    const matchRes = cleanedAsPath.match(regexPattern);

    // Debugging logs
    console.log('Route Object:', routeObj);
    console.log('Original urlString:', urlString);
    console.log('Cleaned urlString:', cleanedUrlString);
    console.log('Regex Pattern:', regexPattern);
    console.log('Cleaned asPath:', cleanedAsPath);
    console.log('Match Result:', matchRes);
    console.log('Keys:', keys);
    console.log('Match Keys Length:', matchRes ? matchRes.length - 1 : 0);

    // Check if matchRes is valid and matches the keys length or it's a static route
    if (matchRes && (!isDynamic || matchRes.length - 1 === keys.length)) {
      // Map dynamic params from the URL into the route object
      if (isDynamic) {
        const params = {};
        keys.forEach((key, index) => {
          params[key] = matchRes[index + 1]; // Map dynamic params from the regex match
        });
        routeObj.params = params; // Add the dynamic params to the route object
      }

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
