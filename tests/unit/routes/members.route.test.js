const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../src/routes/v1/member.route.js'), 'utf8');
const inviteSrc = fs.readFileSync(path.join(__dirname, '../../../src/services/memberInvite.service.js'), 'utf8');

describe('members routes', () => {
  test('invite and accept exist and invite routes are registered before /:userId', () => {
    expect(src.indexOf("/invites/:token")).toBeLessThan(src.indexOf('/:userId'));
    expect(src).toMatch(/auth\('manageUsers'\)/);
    expect(src).toMatch(/acceptInvite/);
  });

  test('invite preview tells Studio whether the email already has an account', () => {
    expect(inviteSrc).toMatch(/presentInvite/);
    expect(inviteSrc).toMatch(/existingAccount/);
    expect(inviteSrc).not.toMatch(/Inviting existing accounts is not in v1/);
  });

  test('invite URL is studio /invite/:token so the copy-link works if SMTP fails', () => {
    expect(inviteSrc).toMatch(/studio\.sling\.biz/);
    expect(inviteSrc).toMatch(/\/invite\/\$\{token\}/);
  });
});
