const { ensureFirstRunHome } = require('../../../src/utils/ensureFirstRunHome');

const makeDb = (seed = {}) => {
  const store = {
    page_routes: seed.page_routes || [],
    layout_config: seed.layout_config || [],
  };

  const matches = (doc, query) =>
    Object.entries(query).every(([key, value]) => {
      if (key === '_id') return String(doc._id) === String(value);
      return doc[key] === value;
    });

  const collection = (name) => ({
    findOne: async (query) => store[name].find((doc) => matches(doc, query)) || null,
    insertOne: async (doc) => {
      store[name].push({ _id: `${name}-${store[name].length + 1}`, ...doc });
      return { insertedId: store[name][store[name].length - 1]._id };
    },
    updateOne: async (query, update) => {
      const doc = store[name].find((row) => matches(row, query));
      if (!doc || !update.$set) return;
      Object.entries(update.$set).forEach(([path, value]) => {
        const parts = path.split('.');
        let cur = doc;
        parts.slice(0, -1).forEach((part) => {
          if (!cur[part] || typeof cur[part] !== 'object') cur[part] = {};
          cur = cur[part];
        });
        cur[parts[parts.length - 1]] = value;
      });
    },
    find: (query) => ({
      project: () => ({
        next: async () => store[name].find((doc) => matches(doc, query)) || null,
        toArray: async () => store[name].filter((doc) => matches(doc, query)),
      }),
      toArray: async () => store[name].filter((doc) => matches(doc, query)),
    }),
  });

  return { collection, store };
};

describe('ensureFirstRunHome', () => {
  test('adds / → home when the company has no home route', async () => {
    const db = makeDb();
    await ensureFirstRunHome(db, 'new@company.com');
    expect(db.store.page_routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url_string: '/',
          page_template: 'home',
          client_id: 'new@company.com',
          ownership: 'private',
        }),
      ]),
    );
    expect(db.store.layout_config[0].config.home.root.body.rows[0].cells[0].key).toBe(
      'DefaultSlingHomePage',
    );
  });

  test('does not insert a second /', async () => {
    const db = makeDb({
      page_routes: [
        {
          url_string: '/',
          page_template: 'home',
          client_id: 'new@company.com',
        },
      ],
      layout_config: [
        {
          _id: 'lay-1',
          client_id: 'new@company.com',
          ownership: 'private',
          config: {
            home: {
              meta: { title: 'Home' },
              root: {
                header: { rows: [] },
                body: {
                  rows: [{ cells: [{ key: 'DefaultSlingHomePage' }] }],
                },
              },
            },
          },
        },
      ],
    });
    await ensureFirstRunHome(db, 'new@company.com');
    expect(db.store.page_routes.filter((row) => row.url_string === '/')).toHaveLength(1);
  });

  test('fills every empty home layout for the company', async () => {
    const emptyHome = {
      meta: { title: 'Home Page Basic' },
      root: { header: { rows: [] } },
    };
    const db = makeDb({
      page_routes: [{ url_string: '/', page_template: 'home', client_id: 'new@company.com' }],
      layout_config: [
        {
          _id: 'lay-1',
          client_id: 'new@company.com',
          ownership: 'private',
          config: { home: emptyHome },
        },
        {
          _id: 'lay-2',
          client_id: 'new@company.com',
          ownership: 'private',
          config: { home: JSON.parse(JSON.stringify(emptyHome)) },
        },
      ],
    });
    await ensureFirstRunHome(db, 'new@company.com');
    expect(db.store.layout_config[0].config.home.root.body.rows[0].cells[0].key).toBe(
      'DefaultSlingHomePage',
    );
    expect(db.store.layout_config[1].config.home.root.body.rows[0].cells[0].key).toBe(
      'DefaultSlingHomePage',
    );
  });
});
