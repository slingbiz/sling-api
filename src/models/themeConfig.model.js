const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const themeConfigSchema = mongoose.Schema(
  {
    client_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    themeStyle: {
      type: String,
    },
    themeMode: {
      type: String,
    },
    navStyle: {
      type: String,
    },
    layoutType: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'theme_config',
  }
);

themeConfigSchema.plugin(toJSON);

const ThemeConfig = mongoose.models.ThemeConfig || mongoose.model('ThemeConfig', themeConfigSchema);

module.exports = ThemeConfig;
