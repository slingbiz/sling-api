const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/services/auth.service.js'), 'utf8');

describe('refreshAuth token rotation', () => {
  test('deletes the used refresh token with deleteOne, not mongoose remove()', () => {
    const fn = src.slice(src.indexOf('const refreshAuth'), src.indexOf('const resetPassword'));
    expect(fn).toMatch(/deleteOne/);
    expect(fn).not.toMatch(/\.remove\(/);
  });
});
