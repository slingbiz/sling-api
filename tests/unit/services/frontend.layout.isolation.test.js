const layouts = {
  'tenant-a': { home: { root: { id: 'a' } } },
  'tenant-b': { home: { root: { id: 'b' } } },
};

jest.mock('../../../src/utils/mongoInit', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn((name) => {
      if (name !== 'layout_config') {
        return { find: jest.fn(() => ({ toArray: async () => [] })) };
      }
      return {
        find: jest.fn((query) => ({
          toArray: async () => {
            if (!query || query.client_id == null) {
              throw new Error('layout lookup must filter by client_id');
            }
            const config = layouts[query.client_id];
            return config ? [{ client_id: query.client_id, config }] : [];
          },
        })),
      };
    }),
  })),
}));

const frontendService = require('../../../src/services/frontend.service');

describe('frontend layout isolation', () => {
  test('client A cannot read client B layout', async () => {
    const layoutA = await frontendService.getLayout({ clientId: 'tenant-a' });
    const layoutB = await frontendService.getLayout({ clientId: 'tenant-b' });
    expect(layoutA.home.root.id).toBe('a');
    expect(layoutB.home.root.id).toBe('b');
  });

  test('missing clientId is rejected', async () => {
    await expect(frontendService.getLayout({})).rejects.toThrow(/clientId/i);
  });
});
