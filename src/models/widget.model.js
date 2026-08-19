const mongoose = require('mongoose');
const { WidgetOwnerShip, WidgetStatus, WidgetSource } = require('../constants/appEnums');
const { toJSON, paginate } = require('./plugins');

const widgetSchema = mongoose.Schema(
  {
    client_id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    ownership: {
      type: String,
      enum: [WidgetOwnerShip.PUBLIC, WidgetOwnerShip.PROTECTED, WidgetOwnerShip.PRIVATE],
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
      default: 'Widgets', // Default icon
    },
    props: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        propType: {
          type: String,
          required: true,
          trim: true,
        },
        dataType: {
          type: String,
          required: true,
          trim: true,
        },
        default: {
          type: mongoose.Schema.Types.Mixed, // Support both string and number as default value
          trim: true,
        },
        options: [
          {
            value: {
              type: mongoose.Schema.Types.Mixed, // Allow options to have both string and number values
              required: true,
            },
            label: {
              type: String,
              required: true,
              trim: true,
            },
          },
        ], // Adding support for options
      },
    ],
    // Governance fields: only meaningful for AI-generated widgets today, but
    // left available to any widget so a manual widget could go through the
    // same review flow later without a schema change.
    source: {
      type: String,
      enum: [WidgetSource.MANUAL, WidgetSource.AI_GENERATED],
      default: WidgetSource.MANUAL,
    },
    // Defaults to PUBLISHED (not DRAFT) so every widget created through the
    // existing create/update flow — which never sets this field — keeps
    // behaving exactly as it does today: live immediately. Only the new
    // AI Builder draft-creation path explicitly sets DRAFT.
    status: {
      type: String,
      enum: [
        WidgetStatus.DRAFT,
        WidgetStatus.PENDING_REVIEW,
        WidgetStatus.APPROVED,
        WidgetStatus.REJECTED,
        WidgetStatus.PUBLISHED,
      ],
      default: WidgetStatus.PUBLISHED,
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
    // Snapshot of the static governance check (see sling-studio's
    // codePolicy.js) at the time the widget was generated, kept for audit
    // even though it's re-checked at submit time too.
    policyViolations: [
      {
        rule: { type: String, trim: true },
        message: { type: String, trim: true },
      },
    ],
    review: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: {
        type: Date,
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
widgetSchema.plugin(toJSON);
widgetSchema.plugin(paginate);

widgetSchema.statics.isKeyTaken = async function (key, type, clientId, excludeUserId) {
  console.log(key, type, clientId, '[key, type, clientId]');
  const widget = await this.findOne({ key, client_id: clientId, type, _id: { $ne: excludeUserId } });
  return !!widget;
};

const Widget = mongoose.models.Widget || mongoose.model('Widget', widgetSchema);

module.exports = Widget;
