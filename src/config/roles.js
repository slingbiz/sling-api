const roles = ['user', 'publisher', 'admin', 'owner'];

const roleRights = new Map();
roleRights.set(roles[0], []);
roleRights.set(roles[1], ['reviewWidgets']);
roleRights.set(roles[2], ['getUsers', 'manageUsers', 'reviewWidgets']);
roleRights.set(roles[3], ['getUsers', 'manageUsers', 'reviewWidgets']);

module.exports = {
  roles,
  roleRights,
};
