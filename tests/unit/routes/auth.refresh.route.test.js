const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/auth.route.js'), 'utf8');

describe('auth refresh-tokens route', () => {
  test('refresh-tokens is not wrapped in auth()', () => {
    expect(src).toMatch(
      /router\.post\(\s*['"]\/refresh-tokens['"]\s*,\s*validate\(\s*authValidation\.refreshTokens\s*\)\s*,\s*authController\.refreshTokens\s*\)/,
    );
    expect(src).not.toMatch(/router\.post\(\s*['"]\/refresh-tokens['"]\s*,\s*auth\(\)/);
  });
});
