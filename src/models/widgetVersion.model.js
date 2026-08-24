const mongoose = require('mongoose');

const SNAPSHOT_ACTIONS = ['save', 'submit', 'publish', 'approve', 'reject', 'revert', 'generate'];

const widgetVersionSchema = mongoose.Schema(
  {
    client_id: {
      type: String,
      required: true,
      index: true,
    },
    widgetId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    action: {
      type: String,
      required: true,
      enum: SNAPSHOT_ACTIONS,
    },
    actorUserId: {
      type: String,
      trim: true,
    },
    actorName: {
      type: String,
      trim: true,
    },
    actorEmail: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    key: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    ownership: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    props: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    code: {
      type: String,
    },
    dependencies: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    generationPrompt: {
      type: String,
      trim: true,
    },
    policyViolations: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'widget_versions',
  }
);

widgetVersionSchema.index({ client_id: 1, widgetId: 1, createdAt: -1 });

const WidgetVersion = mongoose.models.WidgetVersion || mongoose.model('WidgetVersion', widgetVersionSchema);

module.exports = WidgetVersion;
module.exports.SNAPSHOT_ACTIONS = SNAPSHOT_ACTIONS;
