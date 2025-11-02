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

      // Check if this is fakestoreapi.com - use AI-generated mock data instead
      const isFakeStoreApi = url && url.includes('fakestoreapi.com');

      // Check if cached data has old fakestoreapi.com image URLs (needs refresh)
      const cachedData = cached?.cached_response;
      const hasOldFakeStoreImages =
        Array.isArray(cachedData) && cachedData.some((item) => item?.image?.includes('fakestoreapi.com/img'));

      if (cached && cachedData && !hasOldFakeStoreImages && !isFakeStoreApi) {
        // Return cached data immediately (only if not fakestoreapi or doesn't have old images)
        logger.info(`[getSSRApiRes] Using cached response for ${uniqueIdFe} (${url})`);
        apiRetResponse[uniqueIdFe].data = cachedData;
        apiRetResponse[uniqueIdFe].cached = true;
        return; // Skip fetching, use cache
      }

      // If cached data has old fakestoreapi.com images, regenerate it
      if (hasOldFakeStoreImages && isFakeStoreApi) {
        logger.info(`[getSSRApiRes] Cached data has old fakestoreapi.com images, regenerating for ${uniqueIdFe}`);
      }

      if (isFakeStoreApi) {
        // Generate mock products data instead of calling external API
        logger.info(`[getSSRApiRes] Generating mock products for ${uniqueIdFe} instead of calling ${url}`);

        // Cache the mock data and return promise
        const mockPromise = (async () => {
          try {
            // Generate mock products (async - fetches images from Unsplash with caching)
            const mockData = await generateMockProducts();

            // Cache the mock data
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
            return { data: mockData, uniqueIdFe, success: true, cached: false };
          } catch (cacheError) {
            logger.error(
              `[getSSRApiRes] Failed to generate or cache mock products for ${uniqueIdFe}: ${cacheError.message}`
            );
            // Return empty data on error so frontend can still render
            return { data: [], uniqueIdFe, success: false, error: cacheError.message };
          }
        })();

        // Return mock data (wrapped in promise)
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

// // Utility function to convert URL string to regex pattern
// function convertToRegexPattern(urlString) {
//   return `^${urlString.replace(/<([^>]+)>/g, '([^/]+)').replace(/\//g, '\\/')}$`;
// }

const getMatchingRoute = async ({ asPath, query, clientId }) => {
  // TODO: Do not process for url of types /_next/static

  logger.info('=== [getMatchingRoute] Route Matching Request ===');
  logger.info(`[getMatchingRoute] asPath: "${asPath}"`);
  logger.info(`[getMatchingRoute] clientId: "${clientId}"`);
  logger.info(`[getMatchingRoute] query: ${JSON.stringify(query || {})}`);

  const db = getDb();

  // Fetch all routes for the client
  const allRoutes = await db.collection('page_routes').find({ client_id: clientId }).toArray();

  logger.info(`[getMatchingRoute] Found ${allRoutes.length} routes in database for client: "${clientId}"`);

  // Log all routes found
  if (allRoutes.length > 0) {
    logger.info(`[getMatchingRoute] Routes found:`);
    allRoutes.forEach((route, index) => {
      const pageTemplate = route.page_template || 'NOT SET';
      const ownership = route.ownership || 'NOT SET';
      logger.info(
        `[getMatchingRoute]   ${index + 1}. url_string: "${route.url_string}", ` +
          `page_template: "${pageTemplate}", ownership: "${ownership}"`
      );
    });
  } else {
    logger.warn(`[getMatchingRoute] ⚠ No routes found for client_id: "${clientId}"`);
  }

  // Also check if there's a route for "/" with different client_id or ownership (for debugging)
  if (asPath === '/') {
    const rootRoutes = await db.collection('page_routes').find({ url_string: '/' }).toArray();
    if (rootRoutes.length > 0) {
      logger.info(`[getMatchingRoute] Found ${rootRoutes.length} route(s) with url_string="/" in database:`);
      rootRoutes.forEach((route) => {
        logger.info(
          `[getMatchingRoute]   - Route with client_id: "${route.client_id}", ownership: "${route.ownership}", active: ${route.is_active}`
        );
      });
    } else {
      logger.info(`[getMatchingRoute] No route found in entire database with url_string="/"`);
    }
  }

  // Log all route url_strings to debug
  if (allRoutes.length > 0) {
    const routeStrings = allRoutes.map((r) => `"${r.url_string}"`).join(', ');
    logger.info(`[getMatchingRoute] All route url_strings for client ${clientId}: [${routeStrings}]`);
  }

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

  // Special handling for root path "/"
  // When asPath is "/", cleanedAsPath becomes "/" (empty string + "/")
  const isRootPath = cleanedAsPath === '/';

  // Iterate over all routes and attempt to match the asPath
  for (const routeObj of allRoutes) {
    const { url_string: urlString, keys = [] } = routeObj;

    // Clean the route URL
    const cleanedUrlString = cleanUrl(urlString);

    // Special case: handle root path "/" explicitly
    if (isRootPath) {
      // Check if this route is for root path "/"
      // Log exact comparison to debug
      const exactMatch = urlString === '/';
      const cleanedMatch = cleanedUrlString === '';
      logger.info(
        `[getMatchingRoute] Checking route "${urlString}" (cleaned: "${cleanedUrlString}") | exactMatch: ${exactMatch}, cleanedMatch: ${cleanedMatch}`
      );
      if (exactMatch || cleanedMatch) {
        logger.info(`[getMatchingRoute] ✓ MATCH! Found root path route: ${urlString}`);
        routeRet = routeObj;
        break;
      }
      // If looking for root path and this isn't it, skip to next route
    } else {
      // Determine if the route is dynamic based on the keys
      const isDynamic = keys.length > 0;

      // Generate the regex pattern for dynamic or static routes
      // Handle empty cleanedUrlString (root path) specially
      let regexPattern;
      if (isDynamic) {
        regexPattern = new RegExp(`^/${convertToRegexPattern(cleanedUrlString)}$`);
      } else if (cleanedUrlString === '') {
        regexPattern = /^\/$/;
      } else {
        regexPattern = new RegExp(`^/${cleanedUrlString}$`);
      }

      logger.info('Converting URL to Regex:', urlString, ' -> ', regexPattern);

      // Attempt to match the cleaned asPath with the regex pattern
      const matchRes = cleanedAsPath.match(regexPattern);

      // Debugging logs
      logger.info('Route Object:', routeObj);
      logger.info('Original urlString:', urlString);
      logger.info('Cleaned urlString:', cleanedUrlString);
      logger.info('Regex Pattern:', regexPattern);
      logger.info('Cleaned asPath:', cleanedAsPath);
      logger.info('Match Result:', matchRes);
      logger.info('Keys:', keys);
      logger.info('Match Keys Length:', matchRes ? matchRes.length - 1 : 0);

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
  }

  if (Object.keys(routeRet).length === 0) {
    logger.warn(`[getMatchingRoute] ✗ No matching route found for asPath: "${asPath}"`);
    // Log all available routes for debugging
    logger.info(`[getMatchingRoute] Available routes: ${allRoutes.map((r) => r.url_string).join(', ')}`);
    if (isRootPath) {
      logger.info(`[getMatchingRoute] Tip: Create a route with url_string: "/" to handle the root path`);
    }
  } else {
    logger.info(`[getMatchingRoute] ✓ Successfully matched route: "${routeRet.url_string}"`);
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
