const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/ai.route.js'), 'utf8');

describe('ai generate routes', () => {
  test('page and widget generate require a Studio login', () => {
    expect(src).toMatch(/auth\(\)/);
    expect(src).toMatch(/\/page\/generate/);
    expect(src).toMatch(/\/page\/generate\/stream/);
    expect(src).toMatch(/\/widget\/generate/);
    expect(src).toMatch(/\/widget\/generate\/stream/);
  });
});
