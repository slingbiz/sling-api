/* eslint-disable no-restricted-syntax */
const httpStatus = require('http-status');
const axios = require('axios');
const ApiError = require('../utils/ApiError');
const { GLOBAL_SLING_HANDLER } = require('../constants/common');
const { getDb } = require('../utils/mongoInit');
const logger = require('../config/logger');

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
  if (!GLOBAL_SLING_HANDLER.includes(pathname)) {
    return {};
  }
  const db = getDb();

  if (!db) {
    logger.error('[getSSRApiRes] Database connection not available');
    return {}; // Return empty object so frontend can still render
  }

  try {
    // Find api list based on route page template
    const ssrApis = await db
      .collection('api_meta')
      .find({ client_id: clientId, ssr: true })
      .project({ url: 1, type: 1, headers: 1, params: 1, body: 1, unique_id_fe: 1, sling_mapping: 1 })
      .toArray();

    if (!ssrApis || ssrApis.length === 0) {
      return {}; // No SSR APIs configured, return empty object
    }

    const axiosPromiseArr = [];
    const apiRetResponse = {};
    const responseKeyMapper = {};

    // Pass headers from api_meta configuration to axios requests
    ssrApis.forEach((v, k) => {
      const { url, type, body, unique_id_fe: uniqueIdFe, sling_mapping: slingMapping, headers } = v;
      responseKeyMapper[k] = uniqueIdFe;
      apiRetResponse[uniqueIdFe] = { ...apiRetResponse[uniqueIdFe], sling_mapping: slingMapping };

      // Prepare axios config with headers from api_meta
      const axiosConfig = {
        headers: headers || {},
        timeout: 10000, // 10 second timeout
      };

      if (type === 'GET') {
        axiosPromiseArr.push(
          axios.get(url, axiosConfig).catch((err) => {
            // Log error but don't crash - return error info instead
            logger.error(`[getSSRApiRes] Failed to fetch SSR API (GET ${url}): ${err.message}`);
            return {
              data: null,
              error: err.message,
              status: err.response?.status || err.code,
              url,
            };
          })
        );
      }
      if (type === 'POST') {
        axiosPromiseArr.push(
          axios.post(url, body || {}, axiosConfig).catch((err) => {
            // Log error but don't crash - return error info instead
            logger.error(`[getSSRApiRes] Failed to fetch SSR API (POST ${url}): ${err.message}`);
            return {
              data: null,
              error: err.message,
              status: err.response?.status || err.code,
              url,
            };
          })
        );
      }
    });

    const axiosRes = await Promise.all(axiosPromiseArr);

    // Process responses, handling errors gracefully
    axiosRes.forEach((apiResponse, k) => {
      const uniqueIdFe = responseKeyMapper[k];
      if (apiResponse.error) {
        // If API failed, still add it to response with error info
        // Frontend can handle this and show fallback UI
        apiRetResponse[uniqueIdFe] = {
          ...apiRetResponse[uniqueIdFe],
          error: apiResponse.error,
          status: apiResponse.status,
          url: apiResponse.url,
          data: null,
        };
      } else {
        // Success - add data to response
        const { data } = apiResponse;
        const currRetApiRes = apiRetResponse[uniqueIdFe];
        apiRetResponse[uniqueIdFe] = { ...currRetApiRes, data };
      }
    });

    return apiRetResponse;
  } catch (error) {
    // Log error but return empty object so frontend can still render
    logger.error(`[getSSRApiRes] Error fetching SSR APIs for client ${clientId}: ${error.message}`, error);
    return {}; // Return empty object so frontend can show something
  }
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
  // TODO: Do not process for url of types /_next/static

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
