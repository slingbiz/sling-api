const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  // Check for links in any field of userBody
  const containsLink = Object.entries(userBody).some(([key, value]) => {
    if (typeof value === 'string' && key !== 'password' && key !== 'email') {
      // Regular expression to detect various URL formats
      const urlRegex = /(http:\/\/|https:\/\/|www\.)[^\s]+|[^\s]+\.(com|net|org|edu|gov|mil|io|co|uk|de|ru|info|biz|online|xyz)[^\s]*/gi;
      return urlRegex.test(value);
    }
    return false;
  });

  if (containsLink) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Links are not allowed in user fields');
  }

  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  const email = String(userBody.email).toLowerCase();
  if (userBody.workspaceKey) {
    const role = userBody.role && userBody.role !== 'owner' ? userBody.role : 'user';
    const user = await User.create({...userBody, email, workspaceKey: userBody.workspaceKey, role});
    return user;
  }

  const user = await User.create({
    ...userBody,
    email,
    workspaceKey: email,
    role: 'owner',
  });
  return user;
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.role) {
    await assertRoleChange(user, updateBody.role);
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const countOwners = async (workspaceKey) => {
  return User.countDocuments({workspaceKey, role: 'owner'});
};

const assertRoleChange = async (user, nextRole) => {
  if (user.role === 'owner' && nextRole !== 'owner') {
    const owners = await countOwners(user.workspaceKey);
    if (owners <= 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'The last owner cannot be demoted');
    }
  }
  if (nextRole === 'owner') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Owner cannot be assigned. Transfer is not in v1');
  }
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role === 'owner') {
    const owners = await countOwners(user.workspaceKey);
    if (owners <= 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'The last owner cannot be removed');
    }
  }
  await User.deleteOne({_id: user._id});
  return user;
};

const assertCanLeaveWorkspace = async (user) => {
  if (!user || user.role !== 'owner') {
    return;
  }
  const owners = await countOwners(user.workspaceKey);
  if (owners <= 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'The last owner cannot be moved to another workspace'
    );
  }
};

const ensureWorkspace = async (user) => {
  if (!user) return user;
  let changed = false;
  if (!user.workspaceKey) {
    user.workspaceKey = user.email;
    changed = true;
  }
  const owners = await countOwners(user.workspaceKey);
  if (owners === 0) {
    const oldest = await User.findOne({workspaceKey: user.workspaceKey}).sort({createdAt: 1, _id: 1});
    if (oldest) {
      if (String(oldest._id) === String(user._id)) {
        user.role = 'owner';
        changed = true;
      } else if (oldest.role !== 'owner') {
        oldest.role = 'owner';
        await oldest.save();
      }
    }
  }
  if (changed) {
    await user.save();
  }
  return user;
};

const listWorkspaceMembers = async (workspaceKey) => {
  return User.find({workspaceKey}).sort({role: 1, createdAt: 1});
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  ensureWorkspace,
  listWorkspaceMembers,
  countOwners,
  assertCanLeaveWorkspace,
};
