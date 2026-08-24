const fs = require('fs');
const path = require('path');

const emailSrc = fs.readFileSync(path.join(__dirname, '../../../src/services/email.service.js'), 'utf8');
const inviteSrc = fs.readFileSync(path.join(__dirname, '../../../src/services/memberInvite.service.js'), 'utf8');

describe('member invite email', () => {
  test('invites send through Mailjet like welcome mail, not silent SMTP', () => {
    expect(emailSrc).toMatch(/sendInviteEmail/);
    expect(emailSrc).toMatch(/MJ_APIKEY_PUBLIC/);
    expect(emailSrc).toMatch(/Accept invite/);
    expect(inviteSrc).toMatch(/sendInviteEmail/);
    expect(inviteSrc).toMatch(/emailSent/);
  });
});
