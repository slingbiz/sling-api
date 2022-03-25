const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const widgetSchema = mongoose.Schema(
  {
    user: {
      type: String,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
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

widgetSchema.statics.isTitleTaken = async function (name, excludeUserId) {
  const widget = await this.findOne({ name, _id: { $ne: excludeUserId } });
  return !!widget;
};

const Widget = mongoose.model('Widget', widgetSchema);

module.exports = Widget;