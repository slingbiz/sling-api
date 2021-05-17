/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const getInitConfig = async () => {
  // TODO: Get config from mongo
  const layoutConfig = {
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
  return layoutConfig;
};

module.exports = {
  getInitConfig,
};
