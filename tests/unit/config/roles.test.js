const {roles, roleRights} = require('../../../src/config/roles');

describe('widget owner levels', () => {
  test('regular users cannot review or publish', () => {
    expect(roleRights.get('user')).not.toContain('reviewWidgets');
  });

  test('publishers, admins, and owners can review and publish', () => {
    expect(roles).toEqual(expect.arrayContaining(['user', 'publisher', 'admin', 'owner']));
    expect(roleRights.get('publisher')).toContain('reviewWidgets');
    expect(roleRights.get('admin')).toContain('reviewWidgets');
    expect(roleRights.get('owner')).toContain('reviewWidgets');
    expect(roleRights.get('owner')).toContain('manageUsers');
  });
});
