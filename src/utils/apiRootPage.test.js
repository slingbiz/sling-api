const { isLocalHost, rootPayload, rootHtml } = require('./apiRootPage');

describe('apiRootPage', () => {
  test('treats localhost as local', () => {
    expect(isLocalHost('localhost:10001')).toBe(true);
    expect(isLocalHost('127.0.0.1:10001')).toBe(true);
    expect(isLocalHost('api.sling.biz')).toBe(false);
  });

  test('local payload points at Studio and the storefront', () => {
    const payload = rootPayload({ get: () => 'localhost:10001' });
    expect(payload.ok).toBe(true);
    expect(payload.studio).toBe('http://localhost:2021');
    expect(payload.storefront).toBe('http://localhost:4087');
  });

  test('html names the API and links to Studio', () => {
    const html = rootHtml(rootPayload({ get: () => 'localhost:10001' }));
    expect(html).toMatch(/Sling CMS API is running/);
    expect(html).toMatch(/localhost:2021/);
    expect(html).toMatch(/localhost:4087/);
    expect(html).not.toMatch(/Not found/);
    expect(html).not.toMatch(/stack/);
  });
});
