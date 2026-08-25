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

const actorFromUser = (user) => {
  if (!user) {
    return { actorUserId: undefined, actorName: undefined, actorEmail: undefined };
  }
  const raw = user._id != null && user._id !== '' ? user._id : user.id;
  return {
    actorUserId: raw != null && raw !== '' ? String(raw) : undefined,
    actorName: user.name || undefined,
    actorEmail: user.email || undefined,
  };
};

const asActorId = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') {
      const hex = value.toHexString();
      return OBJECT_ID.test(hex) ? hex : null;
    }
    if (value._id) return asActorId(value._id);
    if (value.id) return asActorId(value.id);
  }
  const str = String(value);
  return OBJECT_ID.test(str) ? str : null;
};

const applyActorSnapshot = (event, user) => {
  const meta = (event && event.metadata) || {};
  return {
    ...event,
    actorName: event.actorName || (user && user.name) || meta.actorName,
    actorEmail: event.actorEmail || (user && user.email) || meta.actorEmail,
  };
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

const enrichActors = async (events) => {
  const rows = events || [];
  const ids = [...new Set(rows.map((event) => asActorId(event.actorUserId)).filter(Boolean))];
  let byId = new Map();
  if (ids.length) {
    try {
      const users = await User.find({ _id: { $in: ids } }).select('name email').lean();
      byId = new Map();
      (users || []).forEach((user) => {
        if (user._id) byId.set(String(user._id), user);
        if (user.id) byId.set(String(user.id), user);
      });
    } catch (error) {
      byId = new Map();
    }
  }
  return rows.map((event) => applyActorSnapshot(event, byId.get(asActorId(event.actorUserId) || String(event.actorUserId || ''))));
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
  actorFromUser,
  write,
  list,
};
