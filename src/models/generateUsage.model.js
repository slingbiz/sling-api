const mongoose = require('mongoose');

const generateUsageSchema = mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    day: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'generate_usage',
  }
);

generateUsageSchema.index({ clientId: 1, day: 1 }, { unique: true });

const GenerateUsage = mongoose.models.GenerateUsage || mongoose.model('GenerateUsage', generateUsageSchema);

module.exports = GenerateUsage;
