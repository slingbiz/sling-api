const {roles, roleRights} = require('../../../src/config/roles');

describe('widget owner levels', () => {
  test('regular users cannot review or publish', () => {
    expect(roleRights.get('user')).not.toContain('reviewWidgets');
  });

  test('publishers and admins can review and publish', () => {
    expect(roles).toEqual(expect.arrayContaining(['user', 'publisher', 'admin']));
    expect(roleRights.get('publisher')).toContain('reviewWidgets');
    expect(roleRights.get('admin')).toContain('reviewWidgets');
  });
});
