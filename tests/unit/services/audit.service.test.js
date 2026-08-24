const store = [];
const users = [];

const matches = (doc, query = {}) => {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      return value.some((clause) => matches(doc, clause));
    }
    if (key === '_id' && value && value.$in) {
      return value.$in.map(String).includes(String(doc._id));
    }
    if (value && typeof value === 'object' && value.$in) {
      return value.$in.map(String).includes(String(doc[key]));
    }
    if (value && typeof value === 'object' && value.$regex) {
      return new RegExp(value.$regex, value.$options || '').test(String(doc[key] || ''));
    }
    if (key === 'metadata.key') {
      return String((doc.metadata && doc.metadata.key) || '') === String(value);
    }
    return String(doc[key]) === String(value);
  });
};

jest.mock('../../../src/models/auditLog.model', () => ({
  create: jest.fn(async (body) => {
    const doc = { _id: `a${store.length + 1}`, createdAt: new Date(Date.now() + store.length * 10), ...body };
    store.push(doc);
    return doc;
  }),
  find: jest.fn((query) => ({
    sort: () => ({
      skip: (n) => ({
        limit: (lim) => ({
          lean: async () => {
            const rows = store
              .filter((doc) => matches(doc, query))
              .sort((a, b) => b.createdAt - a.createdAt);
            return rows.slice(n, n + lim);
          },
        }),
      }),
    }),
  })),
  countDocuments: jest.fn(async (query) => store.filter((doc) => matches(doc, query)).length),
}));

jest.mock('../../../src/models/user.model', () => ({
  find: jest.fn((query) => ({
    select: () => ({
      lean: async () => users.filter((user) => matches(user, query)),
    }),
  })),
  findById: jest.fn(() => ({
    select: () => ({
      lean: async () => null,
    }),
  })),
}));

const auditService = require('../../../src/services/audit.service');

describe('audit.service', () => {
  beforeEach(() => {
    store.splice(0, store.length);
    users.splice(0, users.length);
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
      'widget.update',
      'widget.submit_review',
      'widget.approve',
      'widget.reject',
      'widget.publish',
      'widget.revert',
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

  test('lists newest first and filters by action', async () => {
    await auditService.write({
      clientId: 'tenant-a',
      actorUserId: 'user-a',
      action: 'widget.save',
      resourceType: 'widget',
      resourceId: 'w1',
    });
    await auditService.write({
      clientId: 'tenant-a',
      actorUserId: 'user-a',
      action: 'widget.update',
      resourceType: 'widget',
      resourceId: 'w1',
    });

    const listed = await auditService.list({ clientId: 'tenant-a' });
    expect(listed.events[0].action).toBe('widget.update');
    expect(listed.events[1].action).toBe('widget.save');

    const filtered = await auditService.list({ clientId: 'tenant-a', action: 'widget.update' });
    expect(filtered.events).toHaveLength(1);
    expect(filtered.events[0].action).toBe('widget.update');
  });

  test('joins actor name and email when the id is a user', async () => {
    const actorId = '507f1f77bcf86cd799439011';
    users.push({ _id: actorId, name: 'Ada Lovelace', email: 'ada@sling.biz', workspaceKey: 'tenant-a' });
    await auditService.write({
      clientId: 'tenant-a',
      actorUserId: actorId,
      action: 'widget.update',
      resourceType: 'widget',
      resourceId: 'w1',
      metadata: { key: 'LoginForm' },
    });

    const listed = await auditService.list({ clientId: 'tenant-a' });
    expect(listed.events[0].actorName).toBe('Ada Lovelace');
    expect(listed.events[0].actorEmail).toBe('ada@sling.biz');
  });
});
