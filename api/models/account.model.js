const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON } = require('./plugins');
const { pkgTypes } = require('../constants/pkgType');

const acountSchema = mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
      trim: true,
    },
    orgName: {
      type: String,
      required: true,
      trim: true,
    },
    storeName: {
      type: String,
      trim: true,
    },
    storeDomain: {
      type: String,
      trim: true,
    },
    storeDescription: {
      type: String,
      trim: true,
    },
    wlIp: {
      type: String,
      trim: true,
    },
    apiKey: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    verificationStep: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      // required: true,
      trim: true,
    },
    address1: {
      type: String,
      required: true,
      trim: true,
    },
    address2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    zipCode: {
      type: String,
      // required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    packageType: {
      type: String,
      enum: pkgTypes,
      default: pkgTypes.FREE,
    },
    secret: {
      type: String,
      trim: true,
    },
    clientUrl: {
      type: String,
      trim: true,
    },
    database: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
acountSchema.plugin(toJSON);

acountSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * @typedef Account
 */
const Account = mongoose.model('client_meta', acountSchema, 'client_meta');

module.exports = Account;
