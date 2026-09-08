jest.mock('../../../src/models', () => ({ Widget: {}, WidgetVersion: {} }));
jest.mock('../../../src/utils/mongoInit', () => ({ getDb: jest.fn() }));
jest.mock('../../../src/services/githubPublish.service', () => ({}));
jest.mock('../../../src/services/codePolicy.service', () => ({ checkCodePolicy: jest.fn() }));
jest.mock('../../../src/services/widgetVersion.service', () => ({ snapshot: jest.fn() }));

const { clampWidgetPageSize, MAX_WIDGET_PAGE_SIZE } = require('../../../src/services/widgets.service');

describe('widget page size', () => {
  test('honors size 1000 so the storefront registry is not clipped at 50', () => {
    expect(MAX_WIDGET_PAGE_SIZE).toBe(1000);
    expect(clampWidgetPageSize(1000)).toBe(1000);
    expect(clampWidgetPageSize(50)).toBe(50);
  });

  test('clamps above 1000 and defaults missing size to 50', () => {
    expect(clampWidgetPageSize(5000)).toBe(1000);
    expect(clampWidgetPageSize(undefined)).toBe(50);
    expect(clampWidgetPageSize(0)).toBe(50);
  });
});
