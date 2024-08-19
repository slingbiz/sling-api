const mongoose = require('mongoose');
const { WidgetOwnerShip } = require('../constants/appEnums');
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
      default: 'Widgets', // Add default to Widgets
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
          type: String,
          trim: true,
        },
      },
    ],
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
