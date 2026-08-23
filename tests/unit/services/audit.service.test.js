const store = [];

jest.mock('../../../src/models/auditLog.model', () => ({
  create: jest.fn(async (body) => {
    const doc = { _id: `a${store.length + 1}`, createdAt: new Date(), ...body };
    store.push(doc);
    return doc;
  }),
  find: jest.fn((query) => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => store.filter((doc) => !query.client_id || doc.client_id === query.client_id),
        }),
      }),
    }),
  })),
  countDocuments: jest.fn(async (query) => store.filter((doc) => !query.client_id || doc.client_id === query.client_id).length),
}));

const auditService = require('../../../src/services/audit.service');

describe('audit.service', () => {
  beforeEach(() => {
    store.splice(0, store.length);
    jest.clearAllMocks();
  });

  test('missing clientId is rejected', async () => {
    await expect(
      auditService.write({ actorUserId: 'u1', action: 'widget.save', resourceType: 'widget' })
    ).rejects.toThrow(/clientId/i);
    await expect(auditService.list({})).rejects.toThrow(/clientId/i);
  });

  test('writes governance events for this client only', async () => {
    await auditService.write({
      clientId: 'tenant-a',
      actorUserId: 'user-a',
      action: 'widget.generate',
      resourceType: 'widget',
      resourceId: 'w1',
    });
    await auditService.write({
      clientId: 'tenant-b',
      actorUserId: 'user-b',
      action: 'widget.publish',
      resourceType: 'widget',
      resourceId: 'w2',
    });

    const listed = await auditService.list({ clientId: 'tenant-a' });
    expect(listed.events).toHaveLength(1);
    expect(listed.events[0].action).toBe('widget.generate');
    expect(listed.events[0].client_id).toBe('tenant-a');
    expect(listed.events.find((event) => event.client_id === 'tenant-b')).toBeUndefined();
  });

  test('records the required CMS actions', async () => {
    const actions = [
      'widget.generate',
      'widget.save',
      'widget.submit_review',
      'widget.approve',
      'widget.reject',
      'widget.publish',
      'theme.update',
    ];
    await Promise.all(
      actions.map((action) =>
        auditService.write({
          clientId: 'tenant-a',
          actorUserId: 'user-a',
          action,
          resourceType: action.startsWith('theme') ? 'theme' : 'widget',
          resourceId: 'res-1',
        })
      )
    );

    const listed = await auditService.list({ clientId: 'tenant-a' });
    expect(listed.events.map((event) => event.action).sort()).toEqual([...actions].sort());
  });
});
