const { WidgetStatus, WidgetSource } = require('../../../src/constants/appEnums');

const store = [];
const versionStore = [];
const nextId = () => `w${store.length + 1}${Date.now().toString(36)}`;

const matches = (doc, query = {}) => {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && value.$ne != null) {
      return String(doc[key]) !== String(value.$ne);
    }
    return String(doc[key]) === String(value);
  });
};

jest.mock('../../../src/models', () => ({
  Widget: {
    findOne: jest.fn(async (query) => store.find((doc) => matches(doc, query)) || null),
    findOneAndUpdate: jest.fn(async (query, update, options = {}) => {
      const doc = store.find((item) => matches(item, query));
      if (!doc) return null;
      const payload = update.$set || update;
      Object.assign(doc, payload);
      return options.new === false ? doc : doc;
    }),
  },
  WidgetVersion: {
    create: jest.fn(async (body) => {
      const doc = { _id: `v${versionStore.length + 1}`, createdAt: new Date(), ...body };
      versionStore.push(doc);
      return doc;
    }),
    find: jest.fn((query) => ({
      sort: () => ({
        skip: (n) => ({
          limit: (lim) => ({
            lean: async () => {
              const rows = versionStore
                .filter((doc) => matches(doc, query))
                .sort((a, b) => b.createdAt - a.createdAt);
              return rows.slice(n, n + lim);
            },
          }),
        }),
      }),
    })),
    findOne: jest.fn((query) => ({
      lean: async () => versionStore.find((doc) => matches(doc, query)) || null,
    })),
    countDocuments: jest.fn(async (query) => versionStore.filter((doc) => matches(doc, query)).length),
  },
  User: {
    findById: jest.fn(() => ({
      select: () => ({
        lean: async () => null,
      }),
    })),
  },
}));

const widgetVersionService = require('../../../src/services/widgetVersion.service');

const seedWidget = (overrides = {}) => {
  const doc = {
    _id: nextId(),
    client_id: 'tenant-a',
    name: 'LoginForm',
    key: 'LoginForm',
    description: 'Login',
    icon: 'Widgets',
    ownership: 'private',
    type: 'widget',
    status: WidgetStatus.PUBLISHED,
    source: WidgetSource.AI_GENERATED,
    code: 'const PreviewComponent = () => null;',
    props: [{ name: 'title', propType: 'static', dataType: 'string', default: 'Hi' }],
    version: 1,
    ...overrides,
  };
  store.push(doc);
  return doc;
};

describe('widgetVersion.service', () => {
  beforeEach(() => {
    store.splice(0, store.length);
    versionStore.splice(0, versionStore.length);
    jest.clearAllMocks();
  });

  test('missing clientId is rejected', async () => {
    await expect(widgetVersionService.listVersions({ widgetId: 'w1' })).rejects.toThrow(/clientId/i);
    await expect(widgetVersionService.revert({ widgetId: 'w1', versionId: 'v1' })).rejects.toThrow(/clientId/i);
  });

  test('empty history snapshots the current widget so History is not blank', async () => {
    const widget = seedWidget({ code: 'const PreviewComponent = () => "live";' });
    const listed = await widgetVersionService.listVersions({ widgetId: widget._id, clientId: 'tenant-a' });
    expect(listed.tc).toBe(1);
    expect(listed.versions[0].code).toBe('const PreviewComponent = () => "live";');
    expect(listed.versions[0].action).toBe('save');
    expect(listed.versions[0].version).toBe(1);
  });

  test('revert restores code, sets draft, and appends a revert snapshot', async () => {
    const widget = seedWidget({
      code: 'const PreviewComponent = () => "now";',
      status: WidgetStatus.PUBLISHED,
      version: 2,
    });
    const old = await widgetVersionService.snapshot(
      { ...widget, code: 'const PreviewComponent = () => "old";', version: 1, status: WidgetStatus.DRAFT },
      { action: 'save', actorUserId: 'user-a' }
    );
    await widgetVersionService.snapshot(widget, { action: 'publish', actorUserId: 'user-a' });

    const restored = await widgetVersionService.revert({
      widgetId: widget._id,
      versionId: old._id,
      clientId: 'tenant-a',
      actorUserId: 'user-a',
    });

    expect(restored.code).toBe('const PreviewComponent = () => "old";');
    expect(restored.status).toBe(WidgetStatus.DRAFT);
    expect(restored.version).toBe(3);
    expect(versionStore.filter((item) => item.action === 'revert')).toHaveLength(1);
    expect(versionStore).toHaveLength(3);
    expect(store.find((item) => item._id === widget._id).status).toBe(WidgetStatus.DRAFT);
  });

  test('client A cannot list, read, or revert client B versions', async () => {
    const widgetB = seedWidget({ client_id: 'tenant-b', key: 'SecretB', code: 'secret-b' });
    const snapB = await widgetVersionService.snapshot(widgetB, { action: 'save' });

    await expect(
      widgetVersionService.listVersions({ widgetId: widgetB._id, clientId: 'tenant-a' })
    ).rejects.toThrow(/not found/i);
    await expect(
      widgetVersionService.getVersion({ widgetId: widgetB._id, versionId: snapB._id, clientId: 'tenant-a' })
    ).rejects.toThrow(/not found/i);
    await expect(
      widgetVersionService.revert({
        widgetId: widgetB._id,
        versionId: snapB._id,
        clientId: 'tenant-a',
        actorUserId: 'user-a',
      })
    ).rejects.toThrow(/not found/i);

    expect(store.find((item) => item._id === widgetB._id).code).toBe('secret-b');
    expect(store.find((item) => item._id === widgetB._id).status).toBe(WidgetStatus.PUBLISHED);
  });
});
