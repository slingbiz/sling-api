const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const auditLogSchema = mongoose.Schema(
  {
    client_id: {
      type: String,
      required: true,
      index: true,
    },
    actorUserId: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'audit_log',
  }
);

auditLogSchema.index({ client_id: 1, createdAt: -1 });
auditLogSchema.plugin(toJSON);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
