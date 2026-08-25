const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const themeService = require('../services/theme.service');
const auditService = require('../services/audit.service');

const getTheme = catchAsync(async (req, res) => {
  const theme = await themeService.getTheme(req.clientId);
  res.status(httpStatus.OK).send(theme);
});

const setTheme = catchAsync(async (req, res) => {
  const theme = await themeService.saveTheme(req.clientId, req.body);
  const actor = auditService.actorFromUser(req.user);
  await auditService.write({
    clientId: req.clientId,
    actorUserId: actor.actorUserId,
    action: 'theme.update',
    resourceType: 'theme',
    resourceId: req.clientId,
    metadata: {
      ...(actor.actorName ? { actorName: actor.actorName } : {}),
      ...(actor.actorEmail ? { actorEmail: actor.actorEmail } : {}),
    },
  });
  res.status(httpStatus.OK).send(theme);
});

module.exports = {
  getTheme,
  setTheme,
};
