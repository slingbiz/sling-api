const {userBodyContainsLink, userFieldContainsLink} = require('./userFieldContainsLink');

describe('userFieldContainsLink', () => {
  test('does not treat a normal name as a link', () => {
    expect(userFieldContainsLink('name', 'Ankur Pata')).toBe(false);
    expect(userFieldContainsLink('name', 'Sling.biz')).toBe(false);
    expect(userFieldContainsLink('name', 'shop.io')).toBe(false);
  });

  test('blocks a real URL in name', () => {
    expect(userFieldContainsLink('name', 'https://spam.example')).toBe(true);
    expect(userFieldContainsLink('name', 'www.spam.com')).toBe(true);
  });

  test('does not scan email or password', () => {
    expect(userFieldContainsLink('email', 'https://x.com')).toBe(false);
    expect(userFieldContainsLink('password', 'www.secret')).toBe(false);
  });

  test('userBodyContainsLink uses the same rules', () => {
    expect(userBodyContainsLink({name: 'Sling.biz', email: 'a@b.com'})).toBe(false);
    expect(userBodyContainsLink({name: 'http://x.com', email: 'a@b.com'})).toBe(true);
  });
});
