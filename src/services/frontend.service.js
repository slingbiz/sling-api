/* eslint-disable no-restricted-syntax */
const httpStatus = require('http-status');
const axios = require('axios');
const ApiError = require('../utils/ApiError');
const { GLOBAL_SLING_HANDLER } = require('../constants/common');
const { getDb } = require('../utils/mongoInit');
const logger = require('../config/logger');
const { generateMockProducts } = require('./mockProducts.service');

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

    const apiRetResponse = {};

    // First, check all caches in parallel
    const cacheChecks = ssrApis.map(async (v) => {
      const { url, type, body, unique_id_fe: uniqueIdFe } = v;
      const cacheKey = `${clientId}_${url}_${type}_${JSON.stringify(body || {})}`;
      const cached = await db.collection('api_cache').findOne({ cache_key: cacheKey });
      return { v, uniqueIdFe, cacheKey, cached };
    });

    const cacheResults = await Promise.all(cacheChecks);

    // Separate cached APIs from ones that need fetching
    const fetchPromises = [];
    cacheResults.forEach(({ v, uniqueIdFe, cacheKey, cached }) => {
      const { url, type, body, sling_mapping: slingMapping, headers } = v;
      apiRetResponse[uniqueIdFe] = { sling_mapping: slingMapping };

      if (cached && cached.cached_response) {
        // Return cached data immediately
        logger.info(`[getSSRApiRes] Using cached response for ${uniqueIdFe} (${url})`);
        apiRetResponse[uniqueIdFe].data = cached.cached_response;
        apiRetResponse[uniqueIdFe].cached = true;
        return; // Skip fetching, use cache
      }

      // Check if this is fakestoreapi.com - use AI-generated mock data instead
      const isFakeStoreApi = url && url.includes('fakestoreapi.com');

      if (isFakeStoreApi) {
        // Generate mock products data instead of calling external API
        logger.info(`[getSSRApiRes] Generating mock products for ${uniqueIdFe} instead of calling ${url}`);
        const mockData = generateMockProducts();

        // Cache the mock data and return promise
        const mockPromise = (async () => {
          try {
            await db.collection('api_cache').updateOne(
              { cache_key: cacheKey },
              {
                $set: {
                  cache_key: cacheKey,
                  client_id: clientId,
                  api_url: url,
                  unique_id_fe: uniqueIdFe,
                  cached_response: mockData,
                  cached_at: new Date(),
                  updated_at: new Date(),
                },
              },
              { upsert: true }
            );
            logger.info(`[getSSRApiRes] Cached mock products for ${uniqueIdFe}`);
          } catch (cacheError) {
            logger.error(`[getSSRApiRes] Failed to cache mock products for ${uniqueIdFe}: ${cacheError.message}`);
          }
          return { data: mockData, uniqueIdFe, success: true, cached: false };
        })();

        // Return mock data immediately (wrapped in promise)
        fetchPromises.push({ promise: mockPromise, uniqueIdFe });
      } else {
        // For other APIs, fetch from external source
        const axiosConfig = {
          headers: headers || {},
          timeout: 10000, // 10 second timeout
        };

        const fetchPromise = (type === 'GET' ? axios.get(url, axiosConfig) : axios.post(url, body || {}, axiosConfig))
          .then(async (response) => {
            // Success - cache the response for future use
            const { data } = response;
            try {
              await db.collection('api_cache').updateOne(
                { cache_key: cacheKey },
                {
                  $set: {
                    cache_key: cacheKey,
                    client_id: clientId,
                    api_url: url,
                    unique_id_fe: uniqueIdFe,
                    cached_response: data,
                    cached_at: new Date(),
                    updated_at: new Date(),
                  },
                },
                { upsert: true }
              );
              logger.info(`[getSSRApiRes] Cached response for ${uniqueIdFe} (${url})`);
            } catch (cacheError) {
              logger.error(`[getSSRApiRes] Failed to cache response for ${uniqueIdFe}: ${cacheError.message}`);
            }
            return { data, uniqueIdFe, success: true };
          })
          .catch(async (err) => {
            // API failed - check if we have old cached data as fallback
            logger.error(`[getSSRApiRes] Failed to fetch SSR API (${type} ${url}): ${err.message}`);

            // Re-check cache in case it was updated
            const fallbackCache = await db.collection('api_cache').findOne({ cache_key: cacheKey });

            if (fallbackCache && fallbackCache.cached_response) {
              // Return old cached data as fallback
              logger.info(`[getSSRApiRes] API failed, using old cached response for ${uniqueIdFe} (${url})`);
              return { data: fallbackCache.cached_response, uniqueIdFe, cached: true, success: true };
            }

            // No cache available, return error
            return {
              data: null,
              error: err.message,
              status: err.response?.status || err.code,
              url,
              uniqueIdFe,
              success: false,
            };
          });

        fetchPromises.push({ promise: fetchPromise, uniqueIdFe });
      }
    });

    // Wait for all API calls to complete
    const apiResults = await Promise.all(fetchPromises.map((fp) => fp.promise));

    // Process responses
    apiResults.forEach((apiResponse) => {
      const { uniqueIdFe, success, data, error, status, url: errorUrl, cached } = apiResponse;

      if (!success) {
        // API failed and no cache - return error info
        apiRetResponse[uniqueIdFe] = {
          ...apiRetResponse[uniqueIdFe],
          error,
          status,
          url: errorUrl,
          data: null,
        };
      } else {
        // Success or cached fallback - add data to response
        apiRetResponse[uniqueIdFe] = {
          ...apiRetResponse[uniqueIdFe],
          data,
          cached: cached || false,
        };
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
