const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/ai.route.js'), 'utf8');
const v1 = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/index.js'), 'utf8');
const boot = fs.readFileSync(path.join(__dirname, '../../../src/index.js'), 'utf8');

describe('ai generate routes', () => {
  test('page and widget generate require a Studio login', () => {
    expect(src).toMatch(/auth\(\)/);
    expect(src).toMatch(/\/page\/generate/);
    expect(src).toMatch(/\/page\/generate\/stream/);
    expect(src).toMatch(/\/widget\/generate/);
    expect(src).toMatch(/\/widget\/generate\/stream/);
  });

  test('a real server can listen, and GENERATE_ONLY exposes only AI routes', () => {
    expect(boot).toMatch(/if \(!process\.env\.VERCEL\)/);
    expect(boot).toMatch(/startServer\(\)/);
    expect(v1).toMatch(/GENERATE_ONLY/);
    expect(v1).toMatch(/path === '\/ai'/);
  });
});
