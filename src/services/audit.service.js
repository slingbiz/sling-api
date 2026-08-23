const httpStatus = require('http-status');
const AuditLog = require('../models/auditLog.model');
const ApiError = require('../utils/ApiError');

const requireClientId = (clientId) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
};

const write = async ({ clientId, actorUserId, action, resourceType, resourceId, metadata } = {}) => {
  requireClientId(clientId);
  if (!action || !resourceType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'action and resourceType are required');
  }
  return AuditLog.create({
    client_id: clientId,
    actorUserId,
    action,
    resourceType,
    resourceId,
    metadata: metadata || {},
  });
};

const list = async ({ clientId, page = 0, size = 50 } = {}) => {
  requireClientId(clientId);
  const skip = Number(page) * Number(size);
  const limit = Number(size);
  const query = { client_id: clientId };
  const [events, tc] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);
  return { events, tc };
};

module.exports = {
  write,
  list,
};
