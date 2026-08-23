const roles = ['user', 'publisher', 'admin'];

const roleRights = new Map();
roleRights.set(roles[0], []);
roleRights.set(roles[1], ['reviewWidgets']);
roleRights.set(roles[2], ['getUsers', 'manageUsers', 'reviewWidgets']);

module.exports = {
  roles,
  roleRights,
};
