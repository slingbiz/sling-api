const fs = require('fs');
const path = require('path');
const {
  filterDemoCatalogDocs,
  stripDemoLayoutConfig,
} = require('./skipDemoCatalog');

describe('filterDemoCatalogDocs', () => {
  test('drops catalog widgets and keeps Sling chrome', () => {
    const out = filterDemoCatalogDocs('widgets', [
      { key: 'ProductFilters' },
      { key: 'ProductList' },
      { key: 'AppLogo' },
      { key: 'DefaultSlingHomePage' },
    ]);
    expect(out.map((row) => row.key)).toEqual(['AppLogo', 'DefaultSlingHomePage']);
  });

  test('drops the fakestore API and the Dubai products route', () => {
    expect(
      filterDemoCatalogDocs('api_meta', [{ unique_id_fe: 'fakeProducts' }]),
    ).toEqual([]);
    expect(
      filterDemoCatalogDocs('page_routes', [
        { url_string: '/' },
        { url_string: '/<city>/<l1Category>/<l2Category>/products' },
      ]),
    ).toEqual([{ url_string: '/' }]);
  });

  test('strips listing and detail templates from a layout clone', () => {
    const stripped = stripDemoLayoutConfig({
      config: { home: { meta: { title: 'Home' } }, listing: {}, detail: {} },
    });
    expect(stripped.config.home).toBeTruthy();
    expect(stripped.config.listing).toBeUndefined();
    expect(stripped.config.detail).toBeUndefined();
  });

  test('does not clone joke media into a new company', () => {
    expect(filterDemoCatalogDocs('media', [{ title: 'Leapin lizards' }])).toEqual([]);
  });

  test('init_data no longer seeds the watches catalog', () => {
    const seed = fs.readFileSync(
      path.join(__dirname, '../scripts/init_data.js'),
      'utf8',
    );
    expect(seed).not.toMatch(/ProductFilters|fakeProducts|Top watches/);
    expect(seed).toMatch(/DefaultSlingHomePage/);
  });
});
