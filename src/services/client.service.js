const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { getDb } = require('../utils/mongoInit');

// Default Config
// TODO: To be removed.
const layoutConfigDefault = {
  listing: {
    root: {
      header: {
        rows: [{}, {}],
      },
      body: {
        rows: [
          {
            cells: [{ key: 'FilterToggle', payload: {} }],
            config: {
              wrapper: 'DefaultContent',
            },
          },
          {
            cells: [
              {
                key: 'ProductFilters',
                payload: { style: { width: '35%' } },
              },
              {
                key: 'ProductMain',
                rows: [
                  {
                    cells: [
                      {
                        key: 'ListingSummary',
                        payload: {},
                      },
                      {
                        key: 'ListingSearchBar',
                        payload: {},
                      },
                    ],
                    config: {
                      wrapper: 'AppsHeader',
                    },
                  },
                  {
                    cells: [
                      {
                        key: 'ProductList',
                        payload: {},
                      },
                    ],
                    config: {
                      wrapper: 'DefaultContent',
                    },
                  },
                ],
                payload: { style: { width: '75%' } },
              },
            ],
            config: {
              wrapper: 'DefaultContent',
            },
          },
        ],
      },
      footer: {},
    },
  },
};
/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const getInitConfig = async (userId = 'demo') => {
  // Get Db
  const db = getDb();
  let layoutConfig = {};
  try {
    layoutConfig = await db.collection('layout_config').find({ user_id: userId }).toArray();
  } catch (e) {
    console.log(e.message, '[getInitConfig] Service');
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

module.exports = {
  getInitConfig,
  setInitConfig,
};
