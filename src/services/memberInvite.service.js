const crypto = require('crypto');
const moment = require('moment');
const httpStatus = require('http-status');
const {MemberInvite, User} = require('../models');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const emailService = require('./email.service');

const studioBase = () => (process.env.STUDIO_URL || 'https://studio.sling.biz').replace(/\/$/, '');

const inviteUrlFor = (token) => `${studioBase()}/invite/${token}`;

const createInvite = async ({email, role}, actor) => {
  const workspaceKey = actor.workspaceKey || actor.email;
  const normalized = String(email).toLowerCase();
  const existingUser = await User.findOne({email: normalized});
  if (existingUser) {
    if (existingUser.workspaceKey === workspaceKey) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'That person is already in this workspace');
    }
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'That email already has a Sling account. Inviting existing accounts is not in v1'
    );
  }
  const existing = await MemberInvite.findOne({email: normalized, workspaceKey, status: 'pending'});
  if (existing && existing.expiresAt > new Date()) {
    return {invite: existing, inviteUrl: inviteUrlFor(existing.token), alreadyPending: true};
  }
  const token = crypto.randomBytes(24).toString('hex');
  const invite = await MemberInvite.create({
    email: normalized,
    role: role === 'admin' || role === 'publisher' ? role : 'user',
    workspaceKey,
    token,
    invitedBy: actor.email,
    expiresAt: moment().add(7, 'days').toDate(),
    status: 'pending',
  });
  const inviteUrl = inviteUrlFor(token);
  try {
    await emailService.sendEmail(
      normalized,
      'You are invited to a Sling workspace',
      `Join this Sling workspace as ${invite.role}.\n\n${inviteUrl}\n\nThis link expires in 7 days.`
    );
  } catch (err) {
    console.log(err.message, '[createInvite] email skipped');
  }
  return {invite, inviteUrl, alreadyPending: false};
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

const acceptInvite = async (token, {name, password}) => {
  const invite = await getInviteByToken(token);
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
  acceptInvite,
  inviteUrlFor,
};
