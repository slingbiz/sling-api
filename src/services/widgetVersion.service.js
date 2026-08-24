const httpStatus = require('http-status');
const { Widget, WidgetVersion, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { WidgetStatus } = require('../constants/appEnums');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const requireClientId = (clientId) => {
  if (!clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientId is required');
  }
};

const sanitizeWidgetProps = (props) => {
  if (!Array.isArray(props)) {
    return [];
  }
  return props.filter(
    (prop) =>
      prop &&
      String(prop.name || '').trim() &&
      String(prop.propType || '').trim() &&
      String(prop.dataType || '').trim()
  );
};

const shapeVersion = (doc) => {
  if (!doc) return doc;
  return {
    ...doc,
    id: doc.id || (doc._id && String(doc._id)),
  };
};

const findTenantWidget = async (widgetId, clientId) => {
  requireClientId(clientId);
  const widget = await Widget.findOne({ _id: widgetId, client_id: clientId });
  if (!widget) {
    throw new ApiError(httpStatus.NOT_FOUND, `Widget not found: ${widgetId}`);
  }
  return widget;
};

const resolveActor = async (actorUserId) => {
  if (!actorUserId || !OBJECT_ID.test(String(actorUserId))) {
    return { name: undefined, email: undefined };
  }
  try {
    const user = await User.findById(actorUserId).select('name email').lean();
    return { name: user && user.name, email: user && user.email };
  } catch (error) {
    return { name: undefined, email: undefined };
  }
};

const snapshot = async (widget, { actorUserId, action } = {}) => {
  if (!widget) {
    return null;
  }
  const clientId = widget.client_id;
  requireClientId(clientId);
  const actor = await resolveActor(actorUserId);
  return WidgetVersion.create({
    client_id: clientId,
    widgetId: String(widget._id),
    version: widget.version || 1,
    action: action || 'save',
    actorUserId: actorUserId ? String(actorUserId) : undefined,
    actorName: actor.name,
    actorEmail: actor.email,
    status: widget.status,
    name: widget.name,
    key: widget.key,
    description: widget.description,
    icon: widget.icon,
    ownership: widget.ownership,
    type: widget.type,
    props: sanitizeWidgetProps(widget.props),
    code: widget.code,
    dependencies: widget.dependencies || {},
    generationPrompt: widget.generationPrompt,
    policyViolations: widget.policyViolations || [],
  });
};

const ensureFirstSnapshot = async (widget) => {
  const count = await WidgetVersion.countDocuments({
    client_id: widget.client_id,
    widgetId: String(widget._id),
  });
  if (count === 0) {
    await snapshot(widget, { action: 'save' });
  }
};

const listVersions = async ({ widgetId, clientId, page = 0, size = 50 } = {}) => {
  const widget = await findTenantWidget(widgetId, clientId);
  await ensureFirstSnapshot(widget);
  const pageNum = Math.max(0, Number(page) || 0);
  const sizeNum = Math.min(50, Math.max(1, Number(size) || 50));
  const query = { client_id: clientId, widgetId: String(widget._id) };
  const [versions, tc] = await Promise.all([
    WidgetVersion.find(query).sort({ createdAt: -1, _id: -1 }).skip(pageNum * sizeNum).limit(sizeNum).lean(),
    WidgetVersion.countDocuments(query),
  ]);
  return { versions: versions.map(shapeVersion), tc };
};

const getVersion = async ({ widgetId, versionId, clientId } = {}) => {
  const widget = await findTenantWidget(widgetId, clientId);
  const version = await WidgetVersion.findOne({
    _id: versionId,
    widgetId: String(widget._id),
    client_id: clientId,
  }).lean();
  if (!version) {
    throw new ApiError(httpStatus.NOT_FOUND, `Version not found: ${versionId}`);
  }
  return { version: shapeVersion(version) };
};

const revert = async ({ widgetId, versionId, clientId, actorUserId } = {}) => {
  const widget = await findTenantWidget(widgetId, clientId);
  const snap = await WidgetVersion.findOne({
    _id: versionId,
    widgetId: String(widget._id),
    client_id: clientId,
  }).lean();
  if (!snap) {
    throw new ApiError(httpStatus.NOT_FOUND, `Version not found: ${versionId}`);
  }

  const nextVersion = ((widget.version || 1) + 1);
  const restored = await Widget.findOneAndUpdate(
    { _id: widget._id, client_id: clientId },
    {
      $set: {
        name: snap.name,
        key: snap.key,
        description: snap.description,
        icon: snap.icon,
        ownership: snap.ownership,
        type: snap.type || widget.type,
        props: sanitizeWidgetProps(snap.props),
        code: snap.code,
        dependencies: snap.dependencies || {},
        generationPrompt: snap.generationPrompt,
        policyViolations: snap.policyViolations || [],
        status: WidgetStatus.DRAFT,
        version: nextVersion,
      },
    },
    { new: true }
  );
  if (!restored) {
    throw new ApiError(httpStatus.NOT_FOUND, `Widget not found: ${widgetId}`);
  }

  await snapshot(restored, { actorUserId, action: 'revert' });
  return restored;
};

module.exports = {
  snapshot,
  listVersions,
  getVersion,
  revert,
};
