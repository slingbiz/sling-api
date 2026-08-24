const httpStatus = require('http-status');
const AuditLog = require('../models/auditLog.model');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const requireClientId = (clientId) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const enrichActors = async (events) => {
  const ids = [
    ...new Set(
      (events || [])
        .map((event) => event.actorUserId)
        .filter((id) => id && OBJECT_ID.test(String(id)))
        .map((id) => String(id))
    ),
  ];
  if (!ids.length) {
    return events;
  }
  try {
    const users = await User.find({ _id: { $in: ids } }).select('name email').lean();
    const byId = new Map((users || []).map((user) => [String(user._id), user]));
    return events.map((event) => {
      const user = byId.get(String(event.actorUserId));
      if (!user) return event;
      return {
        ...event,
        actorName: user.name,
        actorEmail: user.email,
      };
    });
  } catch (error) {
    return events;
  }
};

const list = async ({ clientId, page = 0, size = 50, action, resourceType, resourceId, q } = {}) => {
  requireClientId(clientId);
  const skip = Number(page) * Number(size);
  const limit = Number(size);
  const query = { client_id: clientId };
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (resourceId) query.resourceId = String(resourceId);

  if (q && String(q).trim()) {
    const cond = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
    const or = [{ action: cond }, { resourceType: cond }, { resourceId: cond }, { 'metadata.key': cond }];
    try {
      const people = await User.find({
        workspaceKey: clientId,
        $or: [{ name: cond }, { email: cond }],
      })
        .select('_id')
        .lean();
      if (people && people.length) {
        or.push({ actorUserId: { $in: people.map((person) => String(person._id)) } });
      }
    } catch (error) {
      // Search still works on action / resource without actor names.
    }
    query.$or = or;
  }

  const [events, tc] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);
  return { events: await enrichActors(events), tc };
};

module.exports = {
  write,
  list,
};
