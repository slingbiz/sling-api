const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/services/account.service.js'), 'utf8');
const setup = src.slice(src.indexOf('const CompanyInitialSetup'), src.indexOf('module.exports'));

describe('CompanyInitialSetup gallery', () => {
  test('does not clone public media or media_constants into a new workspace', () => {
    expect(setup).not.toMatch(/collection\('media_constants'\)/);
    expect(setup).not.toMatch(/collection\('media'\)/);
    expect(setup).not.toMatch(/insertMany\([\s\S]*mediaPublic/);
    expect(setup).toMatch(/empty gallery/);
    expect(setup).toMatch(/ensureFirstRunHome/);
  });
});
