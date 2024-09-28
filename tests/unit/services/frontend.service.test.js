const frontendService = require('../../../src/services/frontend.service'); // Adjust this path based on your structure
const { getDb } = require('../../../src/utils/mongoInit'); // Adjust this path based on your structure

jest.mock('../../../src/utils/mongoInit', () => ({
  getDb: jest.fn().mockReturnValue({
    collection: jest.fn(() => ({
      find: jest.fn(() => ({
        toArray: jest.fn(() => []), // Ensure that we return an array
      })),
    })),
  }),
}));

describe('Frontend Service - getMatchingRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should match a static route', async () => {
    getDb()
      .collection()
      .find()
      .toArray.mockResolvedValue([{ url_string: '/harvest', client_id: 'test-client-id', keys: [] }]);

    const result = await frontendService.getMatchingRoute({
      asPath: '/harvest',
      query: {},
      clientId: 'test-client-id',
    });

    expect(result.url_string).toBe('/harvest');
  });

  it('should match a dynamic route', async () => {
    getDb()
      .collection()
      .find()
      .toArray.mockResolvedValue([
        {
          url_string: '/<city>/<l1Category>/<l2Category>/products',
          client_id: 'test-client-id',
          keys: ['city', 'l1Category', 'l2Category'],
        },
      ]);

    const result = await frontendService.getMatchingRoute({
      asPath: '/dubai/women/clothes/products',
      query: {},
      clientId: 'test-client-id',
    });

    expect(result.url_string).toBe('/<city>/<l1Category>/<l2Category>/products');
    expect(result.keys).toEqual(['city', 'l1Category', 'l2Category']);
  });

  it('should return empty object when no route matches', async () => {
    getDb().collection().find().toArray.mockResolvedValue([]);

    const result = await frontendService.getMatchingRoute({
      asPath: '/non-existing-path',
      query: {},
      clientId: 'test-client-id',
    });

    expect(result).toEqual({});
  });

  it('should match the correct dynamic route even with multiple keys', async () => {
    getDb()
      .collection()
      .find()
      .toArray.mockResolvedValue([
        {
          url_string: '/<city>/<l1Category>/<l2Category>/products',
          client_id: 'test-client-id',
          keys: ['city', 'l1Category', 'l2Category'],
        },
      ]);

    const result = await frontendService.getMatchingRoute({
      asPath: '/dubai/women/shoes/products',
      query: {},
      clientId: 'test-client-id',
    });

    expect(result.url_string).toBe('/<city>/<l1Category>/<l2Category>/products');
    expect(result.keys).toEqual(['city', 'l1Category', 'l2Category']);
  });

  it('should match a route even if trailing slashes are present in asPath or urlString', async () => {
    getDb()
      .collection()
      .find()
      .toArray.mockResolvedValue([{ url_string: '/harvest/', client_id: 'test-client-id', keys: [] }]);

    const result = await frontendService.getMatchingRoute({
      asPath: '/harvest/',
      query: {},
      clientId: 'test-client-id',
    });

    expect(result.url_string).toBe('/harvest/');
  });

  it('should match a route with a query string in asPath', async () => {
    getDb()
      .collection()
      .find()
      .toArray.mockResolvedValue([{ url_string: '/harvest', client_id: 'test-client-id', keys: [] }]);

    const result = await frontendService.getMatchingRoute({
      asPath: '/harvest?key=value',
      query: {},
      clientId: 'test-client-id',
    });

    expect(result.url_string).toBe('/harvest');
  });
});
