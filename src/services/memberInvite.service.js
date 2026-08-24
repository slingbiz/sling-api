const crypto = require('crypto');
const moment = require('moment');
const httpStatus = require('http-status');
const {MemberInvite, User} = require('../models');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const emailService = require('./email.service');

const studioBase = () => (process.env.STUDIO_URL || 'https://studio.sling.biz').replace(/\/$/, '');

const inviteUrlFor = (token) => `${studioBase()}/invite/${token}`;

const inviteRole = (role) => (role === 'admin' || role === 'publisher' ? role : 'user');

const createInvite = async ({email, role}, actor) => {
  const workspaceKey = actor.workspaceKey || actor.email;
  const normalized = String(email).toLowerCase();
  const existingUser = await User.findOne({email: normalized});
  if (existingUser) {
    if (existingUser.workspaceKey === workspaceKey) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'That person is already in this workspace');
    }
    await userService.assertCanLeaveWorkspace(existingUser);
  }
  const existing = await MemberInvite.findOne({email: normalized, workspaceKey, status: 'pending'});
  if (existing && existing.expiresAt > new Date()) {
    return {invite: existing, inviteUrl: inviteUrlFor(existing.token), alreadyPending: true, emailSent: false};
  }
  const token = crypto.randomBytes(24).toString('hex');
  const invite = await MemberInvite.create({
    email: normalized,
    role: inviteRole(role),
    workspaceKey,
    token,
    invitedBy: actor.email,
    expiresAt: moment().add(7, 'days').toDate(),
    status: 'pending',
  });
  const inviteUrl = inviteUrlFor(token);
  const roleLabel = invite.role === 'user' ? 'Member' : invite.role;
  let emailSent = false;
  try {
    emailSent = await emailService.sendInviteEmail(normalized, inviteUrl, roleLabel);
  } catch (err) {
    console.log(err.message, '[createInvite] email skipped');
    emailSent = false;
  }
  return {invite, inviteUrl, alreadyPending: false, emailSent};
};

const listInvites = async (workspaceKey) => {
  return MemberInvite.find({workspaceKey, status: 'pending', expiresAt: {$gt: new Date()}}).sort({createdAt: -1});
};

const revokeInvite = async (inviteId, workspaceKey) => {
  const invite = await MemberInvite.findOne({_id: inviteId, workspaceKey});
  if (!invite) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invite not found');
  }
  invite.status = 'revoked';
  await invite.save();
  return invite;
};

const getInviteByToken = async (token) => {
  const invite = await MemberInvite.findOne({token, status: 'pending'});
  if (!invite || invite.expiresAt < new Date()) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invite is invalid or expired');
  }
  return invite;
};

const presentInvite = async (token) => {
  const invite = await getInviteByToken(token);
  const existingUser = await User.findOne({email: invite.email});
  return {email: invite.email, role: invite.role, existingAccount: Boolean(existingUser)};
};

const acceptInvite = async (token, {name, password} = {}) => {
  const invite = await getInviteByToken(token);
  const existingUser = await User.findOne({email: invite.email});
  if (existingUser) {
    if (existingUser.workspaceKey === invite.workspaceKey) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'That person is already in this workspace');
    }
    await userService.assertCanLeaveWorkspace(existingUser);
    existingUser.workspaceKey = invite.workspaceKey;
    existingUser.role = inviteRole(invite.role);
    await existingUser.save();
    invite.status = 'accepted';
    await invite.save();
    return existingUser;
  }
  if (!name || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Name and password are required');
  }
  const user = await userService.createUser({
    name,
    email: invite.email,
    password,
    role: invite.role,
    workspaceKey: invite.workspaceKey,
  });
  invite.status = 'accepted';
  await invite.save();
  return user;
};

module.exports = {
  createInvite,
  listInvites,
  revokeInvite,
  getInviteByToken,
  presentInvite,
  acceptInvite,
  inviteUrlFor,
};
