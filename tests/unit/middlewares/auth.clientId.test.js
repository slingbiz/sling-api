const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/middlewares/auth.js'), 'utf8');

describe('auth clientId', () => {
  test('authenticated routes require a real clientId and do not fall back to demo-id', () => {
    expect(src).toMatch(/clientId is required/);
    expect(src).not.toMatch(/demo-id/);
    expect(src).toMatch(/user\.email \|\| clientId/);
  });
});
