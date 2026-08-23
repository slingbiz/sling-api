const { WidgetStatus, WidgetSource } = require('../../../src/constants/appEnums');

const store = [];
const nextId = () => `w${store.length + 1}${Date.now().toString(36)}`;

const matches = (doc, query = {}) => {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      return value.some((clause) => matches(doc, clause));
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.$ne != null) {
        return String(doc[key]) !== String(value.$ne);
      }
      if (Object.prototype.hasOwnProperty.call(value, '$exists')) {
        const present = Object.prototype.hasOwnProperty.call(doc, key) && doc[key] !== undefined;
        return value.$exists ? present : !present;
      }
    }
    if (value === null) {
      return doc[key] == null;
    }
    return String(doc[key]) === String(value);
  });
};

jest.mock('../../../src/models', () => ({
  Widget: {
    findOne: jest.fn(async (query) => store.find((doc) => matches(doc, query)) || null),
    find: jest.fn(async (query) => store.filter((doc) => matches(doc, query))),
    create: jest.fn(async (body) => {
      const doc = {
        _id: nextId(),
        ...body,
        save: jest.fn(async function save() {
          const idx = store.findIndex((item) => item._id === this._id);
          if (idx >= 0) Object.assign(store[idx], this);
          return this;
        }),
      };
      store.push(doc);
      return doc;
    }),
    findByIdAndUpdate: jest.fn(async (id, body) => {
      const doc = store.find((item) => String(item._id) === String(id));
      if (!doc) return null;
      Object.assign(doc, body);
      return doc;
    }),
    findOneAndUpdate: jest.fn(async (query, update, options = {}) => {
      const doc = store.find((item) => matches(item, query));
      if (!doc) return null;
      const payload = update.$set || update;
      Object.assign(doc, payload);
      return options.new === false ? doc : doc;
    }),
    findByIdAndDelete: jest.fn(async (id) => {
      const idx = store.findIndex((item) => String(item._id) === String(id));
      if (idx < 0) return null;
      const [removed] = store.splice(idx, 1);
      return removed;
    }),
    findOneAndDelete: jest.fn(async (query) => {
      const idx = store.findIndex((item) => matches(item, query));
      if (idx < 0) return null;
      const [removed] = store.splice(idx, 1);
      return removed;
    }),
    isKeyTaken: jest.fn(async (key, type, clientId) => store.some((doc) => doc.key === key && doc.type === type && doc.client_id === clientId)),
  },
}));

jest.mock('../../../src/utils/mongoInit', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn((name) => {
      if (name !== 'widgets') {
        return { find: jest.fn(), countDocuments: jest.fn() };
      }
      return {
        find: jest.fn((query) => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                toArray: async () => {
                  const and = (query && query.$and) || [query || {}];
                  return store.filter((doc) => and.every((clause) => matches(doc, clause)));
                },
              }),
            }),
          }),
        })),
        countDocuments: jest.fn(async (query) => {
          const and = (query && query.$and) || [query || {}];
          return store.filter((doc) => and.every((clause) => matches(doc, clause))).length;
        }),
      };
    }),
  })),
}));

jest.mock('../../../src/services/githubPublish.service', () => ({
  publishGeneratedWidgetToRepo: jest.fn().mockResolvedValue(undefined),
}));

const githubPublishService = require('../../../src/services/githubPublish.service');
const widgetsService = require('../../../src/services/widgets.service');

const safeCode = 'const PreviewComponent = () => null;';
const fetchCode = 'const PreviewComponent = () => { fetch("https://evil.example"); return null; };';
const evalCode = 'const PreviewComponent = () => { eval("alert(1)"); return null; };';

const baseWidget = (overrides = {}) => ({
  name: 'LoginForm',
  key: overrides.key || `LoginForm${store.length}`,
  description: 'Login form',
  ownership: 'private',
  type: 'widget',
  icon: 'Widgets',
  source: WidgetSource.AI_GENERATED,
  status: WidgetStatus.DRAFT,
  code: safeCode,
  dependencies: { '@material-ui/core': ['Button'] },
  ...overrides,
});

describe('widgets governance', () => {
  beforeEach(() => {
    store.splice(0, store.length);
    jest.clearAllMocks();
  });

  test('missing clientId is rejected on list/create/update/publish', async () => {
    await expect(widgetsService.getWidgets({ type: 'widget' })).rejects.toThrow(/clientId/i);
    await expect(widgetsService.createWidget(baseWidget(), null)).rejects.toThrow(/clientId/i);
    await expect(widgetsService.updateWidget('id-1', { name: 'X' }, undefined)).rejects.toThrow(/clientId/i);
    await expect(widgetsService.publishWidget('id-1', '')).rejects.toThrow(/clientId/i);
  });

  test('client A cannot list client B widgets', async () => {
    await widgetsService.createWidget(baseWidget({ key: 'WidgetA', name: 'A' }), 'tenant-a');
    await widgetsService.createWidget(baseWidget({ key: 'WidgetB', name: 'B' }), 'tenant-b');

    const listedA = await widgetsService.getWidgets({ clientId: 'tenant-a', type: 'widget' });
    const listedB = await widgetsService.getWidgets({ clientId: 'tenant-b', type: 'widget' });

    expect(listedA.widgets.every((widget) => widget.client_id === 'tenant-a')).toBe(true);
    expect(listedA.widgets.find((widget) => widget.key === 'WidgetB')).toBeUndefined();
    expect(listedB.widgets.find((widget) => widget.key === 'WidgetA')).toBeUndefined();
  });

  test('client A cannot update or delete client B widget', async () => {
    const widgetB = await widgetsService.createWidget(baseWidget({ key: 'SecretB', name: 'Secret' }), 'tenant-b');

    await expect(
      widgetsService.updateWidget(widgetB._id, { name: 'Hijacked' }, 'tenant-a')
    ).rejects.toThrow(/not found|wrong/i);
    expect(store.find((item) => item._id === widgetB._id).name).toBe('Secret');

    await expect(widgetsService.deleteWidget(widgetB._id, 'tenant-a')).rejects.toThrow(/not found/i);
    expect(store.find((item) => item._id === widgetB._id)).toBeTruthy();
  });

  test('client A cannot submit, review, or publish client B widget', async () => {
    const widgetB = await widgetsService.createWidget(baseWidget({ key: 'ReviewB' }), 'tenant-b');

    await expect(widgetsService.submitWidgetForReview(widgetB._id, 'tenant-a')).rejects.toThrow(/not found/i);
    await expect(widgetsService.reviewWidget(widgetB._id, { action: 'approve' }, 'tenant-a', 'user-a')).rejects.toThrow(
      /not found/i
    );
    await expect(widgetsService.publishWidget(widgetB._id, 'tenant-a')).rejects.toThrow(/not found/i);
    expect(store.find((item) => item._id === widgetB._id).status).toBe(WidgetStatus.DRAFT);
  });

  test('update by key cannot write fetch( onto a published widget', async () => {
    const widget = await widgetsService.createWidget(baseWidget({ key: 'LiveKey' }), 'tenant-a');
    widget.status = WidgetStatus.PUBLISHED;
    await expect(
      widgetsService.updateWidgetByKey('LiveKey', { code: fetchCode }, 'tenant-a')
    ).rejects.toThrow(/policy|fetch|not permitted/i);
    expect(store.find((item) => item._id === widget._id).code).toBe(safeCode);
  });

  test('update by key is scoped to this clientId', async () => {
    await widgetsService.createWidget(baseWidget({ key: 'SharedKey', name: 'A' }), 'tenant-a');
    const widgetB = await widgetsService.createWidget(baseWidget({ key: 'SharedKey', name: 'B' }), 'tenant-b');

    const updated = await widgetsService.updateWidgetByKey('SharedKey', { description: 'touched-a' }, 'tenant-a');
    expect(updated.client_id).toBe('tenant-a');
    expect(store.find((item) => item._id === widgetB._id).description).toBe('Login form');
  });

  test('publish only includes this tenant published AI widgets', async () => {
    const widgetA = await widgetsService.createWidget(baseWidget({ key: 'PubA' }), 'tenant-a');
    const widgetB = await widgetsService.createWidget(baseWidget({ key: 'PubB' }), 'tenant-b');
    widgetA.status = WidgetStatus.APPROVED;
    widgetB.status = WidgetStatus.PUBLISHED;
    widgetB.source = WidgetSource.AI_GENERATED;

    await widgetsService.publishWidget(widgetA._id, 'tenant-a');

    expect(githubPublishService.publishGeneratedWidgetToRepo).toHaveBeenCalled();
    const bundled = githubPublishService.publishGeneratedWidgetToRepo.mock.calls[0][1];
    expect(bundled.every((widget) => widget.client_id === 'tenant-a')).toBe(true);
    expect(bundled.find((widget) => widget.key === 'PubB')).toBeUndefined();
  });

  test('AI widgets stay draft on create even if status published is sent', async () => {
    const widget = await widgetsService.createWidget(
      baseWidget({ key: 'ForceDraft', status: WidgetStatus.PUBLISHED }),
      'tenant-a'
    );
    expect(widget.status).toBe(WidgetStatus.DRAFT);
  });

  test('update cannot skip review by setting status published', async () => {
    const widget = await widgetsService.createWidget(baseWidget({ key: 'NoSkip' }), 'tenant-a');
    await expect(
      widgetsService.updateWidget(widget._id, { status: WidgetStatus.PUBLISHED }, 'tenant-a')
    ).rejects.toThrow(/review|approved|publish/i);
    expect(store.find((item) => item._id === widget._id).status).toBe(WidgetStatus.DRAFT);
  });

  test('admin can publish a draft or pending widget; rejected still cannot go live', async () => {
    const draft = await widgetsService.createWidget(baseWidget({ key: 'StillDraft' }), 'tenant-a');
    const live = await widgetsService.publishWidget(draft._id, 'tenant-a');
    expect(live.status).toBe(WidgetStatus.PUBLISHED);

    const pending = await widgetsService.createWidget(baseWidget({ key: 'StillPending' }), 'tenant-a');
    pending.status = WidgetStatus.PENDING_REVIEW;
    const fromQueue = await widgetsService.publishWidget(pending._id, 'tenant-a');
    expect(fromQueue.status).toBe(WidgetStatus.PUBLISHED);

    const rejected = await widgetsService.createWidget(baseWidget({ key: 'StillRejected' }), 'tenant-a');
    rejected.status = WidgetStatus.REJECTED;
    await expect(widgetsService.publishWidget(rejected._id, 'tenant-a')).rejects.toThrow(/cannot be published/i);
  });

  test('published list includes pre-governance widgets that have no status', async () => {
    store.push({
      _id: 'legacy-live',
      name: 'LegacyLive',
      key: 'LegacyLive',
      description: 'Created before governance',
      ownership: 'private',
      type: 'widget',
      client_id: 'tenant-a',
    });
    await widgetsService.createWidget(baseWidget({ key: 'DraftA', status: WidgetStatus.DRAFT }), 'tenant-a');

    const listed = await widgetsService.getWidgets({
      clientId: 'tenant-a',
      status: WidgetStatus.PUBLISHED,
    });

    const keys = listed.widgets.map((widget) => widget.key);
    expect(keys).toContain('LegacyLive');
    expect(keys).not.toContain('DraftA');
  });

  test('storefront registry only returns published widgets for that clientId', async () => {
    const publishedA = await widgetsService.createWidget(baseWidget({ key: 'LiveA' }), 'tenant-a');
    publishedA.status = WidgetStatus.PUBLISHED;
    await widgetsService.createWidget(baseWidget({ key: 'DraftA', status: WidgetStatus.DRAFT }), 'tenant-a');
    const pending = await widgetsService.createWidget(baseWidget({ key: 'PendA' }), 'tenant-a');
    pending.status = WidgetStatus.PENDING_REVIEW;
    const rejected = await widgetsService.createWidget(baseWidget({ key: 'RejA' }), 'tenant-a');
    rejected.status = WidgetStatus.REJECTED;
    const publishedB = await widgetsService.createWidget(baseWidget({ key: 'LiveB' }), 'tenant-b');
    publishedB.status = WidgetStatus.PUBLISHED;

    const registry = await widgetsService.getWidgets({
      clientId: 'tenant-a',
      type: 'widget',
      status: WidgetStatus.PUBLISHED,
    });

    const keys = registry.widgets.map((widget) => widget.key);
    expect(keys).toEqual(['LiveA']);
    expect(keys).not.toContain('DraftA');
    expect(keys).not.toContain('PendA');
    expect(keys).not.toContain('RejA');
    expect(keys).not.toContain('LiveB');
  });

  test('code with fetch( cannot be saved as published and cannot be published', async () => {
    await expect(
      widgetsService.createWidget(baseWidget({ key: 'FetchLive', status: WidgetStatus.PUBLISHED, code: fetchCode }), 'tenant-a')
    ).rejects.toThrow(/policy|fetch|not permitted/i);

    const draft = await widgetsService.createWidget(baseWidget({ key: 'FetchDraft', code: fetchCode }), 'tenant-a');
    expect(draft.policyViolations.length).toBeGreaterThan(0);
    await expect(widgetsService.submitWidgetForReview(draft._id, 'tenant-a')).rejects.toThrow(/policy|fetch|not permitted/i);

    draft.status = WidgetStatus.APPROVED;
    await expect(widgetsService.publishWidget(draft._id, 'tenant-a')).rejects.toThrow(/policy|fetch|not permitted/i);
    expect(store.find((item) => item._id === draft._id).status).toBe(WidgetStatus.APPROVED);
  });

  test('code with eval( cannot be saved as published and cannot be published', async () => {
    await expect(
      widgetsService.createWidget(baseWidget({ key: 'EvalLive', status: WidgetStatus.PUBLISHED, code: evalCode }), 'tenant-a')
    ).rejects.toThrow(/policy|eval|not permitted/i);

    const draft = await widgetsService.createWidget(baseWidget({ key: 'EvalDraft', code: evalCode }), 'tenant-a');
    expect(draft.policyViolations.some((item) => /eval/i.test(item.message) || item.rule === 'banned-identifier')).toBe(true);
    draft.status = WidgetStatus.APPROVED;
    await expect(widgetsService.publishWidget(draft._id, 'tenant-a')).rejects.toThrow(/policy|eval|not permitted/i);
  });

  test('regenerating an AI draft bumps version instead of creating a second widget', async () => {
    const first = await widgetsService.createWidget(baseWidget({ key: 'LoginForm' }), 'tenant-a');
    expect(first.version).toBe(1);

    const second = await widgetsService.createWidget(
      baseWidget({ key: 'LoginForm', description: 'Login form v2' }),
      'tenant-a',
    );

    expect(second._id).toBe(first._id);
    expect(second.version).toBe(2);
    expect(store.filter((item) => item.key === 'LoginForm' && item.client_id === 'tenant-a')).toHaveLength(1);
  });
});
