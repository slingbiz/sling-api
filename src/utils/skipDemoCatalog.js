const DEMO_WIDGET_KEYS = new Set([
  'ProductList',
  'ProductFilters',
  'ProductView',
  'ProductImageSlider',
  'SimilarProductList',
  'ListingSearchBar',
  'ListingSummaryTopBar',
  'FilterToggle',
  'PureListingSearchBar',
  'ProductDetailPageComponent',
]);

const DEMO_API_IDS = new Set(['fakeProducts']);

const DEMO_ROUTE_PATTERNS = [
  '/<city>/<l1Category>/<l2Category>/products',
];

function isDemoWidget(doc) {
  return DEMO_WIDGET_KEYS.has(doc && doc.key);
}

function isDemoApi(doc) {
  return DEMO_API_IDS.has(doc && doc.unique_id_fe);
}

function isDemoRoute(doc) {
  return DEMO_ROUTE_PATTERNS.includes(doc && doc.url_string);
}

function stripDemoLayoutConfig(doc) {
  if (!doc || !doc.config) return doc;
  const next = { ...doc, config: { ...doc.config } };
  delete next.config.listing;
  delete next.config.detail;
  return next;
}

function filterDemoCatalogDocs(collectionName, docs) {
  const rows = Array.isArray(docs) ? docs : [];
  if (collectionName === 'widgets') return rows.filter((doc) => !isDemoWidget(doc));
  if (collectionName === 'api_meta') return rows.filter((doc) => !isDemoApi(doc));
  if (collectionName === 'page_routes') return rows.filter((doc) => !isDemoRoute(doc));
  if (collectionName === 'layout_config') return rows.map(stripDemoLayoutConfig);
  if (collectionName === 'media' || collectionName === 'media_constants') return [];
  return rows;
}

module.exports = {
  DEMO_WIDGET_KEYS,
  filterDemoCatalogDocs,
  stripDemoLayoutConfig,
};
