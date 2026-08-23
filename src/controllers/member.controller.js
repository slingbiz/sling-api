const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const {userService, tokenService} = require('../services');
const memberInviteService = require('../services/memberInvite.service');
const ApiError = require('../utils/ApiError');

const workspaceOf = (user) => user.workspaceKey || user.email;

const listMembers = catchAsync(async (req, res) => {
  const workspaceKey = workspaceOf(req.user);
  const [members, invites] = await Promise.all([
    userService.listWorkspaceMembers(workspaceKey),
    memberInviteService.listInvites(workspaceKey),
  ]);
  res.send({
    members,
    invites: invites.map((invite) => ({
      ...invite.toJSON(),
      inviteUrl: memberInviteService.inviteUrlFor(invite.token),
    })),
  });
});

const inviteMember = catchAsync(async (req, res) => {
  const result = await memberInviteService.createInvite(req.body, req.user);
  res.status(httpStatus.CREATED).send(result);
});

const changeRole = catchAsync(async (req, res) => {
  const workspaceKey = workspaceOf(req.user);
  const target = await userService.getUserById(req.params.userId);
  if (!target || target.workspaceKey !== workspaceKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Member not found');
  }
  const user = await userService.updateUserById(req.params.userId, {role: req.body.role});
  res.send({user});
});

const removeMember = catchAsync(async (req, res) => {
  const workspaceKey = workspaceOf(req.user);
  const target = await userService.getUserById(req.params.userId);
  if (!target || target.workspaceKey !== workspaceKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Member not found');
  }
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const revokeInvite = catchAsync(async (req, res) => {
  const invite = await memberInviteService.revokeInvite(req.params.inviteId, workspaceOf(req.user));
  res.send({invite});
});

const getInvite = catchAsync(async (req, res) => {
  const invite = await memberInviteService.getInviteByToken(req.params.token);
  res.send({email: invite.email, role: invite.role});
});

const acceptInvite = catchAsync(async (req, res) => {
  const user = await memberInviteService.acceptInvite(req.params.token, req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({user, tokens});
});

module.exports = {
  listMembers,
  inviteMember,
  changeRole,
  removeMember,
  revokeInvite,
  getInvite,
  acceptInvite,
};
