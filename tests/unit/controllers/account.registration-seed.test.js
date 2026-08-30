const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/controllers/account.controller.js'), 'utf8');

describe('company registration seeds first-run pages', () => {
  test('registration runs CompanyInitialSetup so / exists before Keys', () => {
    const register = src.slice(
      src.indexOf('const CompanyRegistrationForm'),
      src.indexOf('const CompanyMembershipForm'),
    );
    expect(register).toMatch(/CompanyInitialSetup\(req\.clientId\)/);
  });
});
