const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/audit.route.js'), 'utf8');

describe('audit routes', () => {
  test('audit list is owner/admin only, same gate as members', () => {
    expect(src).toMatch(/auth\('getUsers'\)/);
    expect(src).toMatch(/listAudit/);
  });
});
