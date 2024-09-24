const Joi = require('joi');

const registration = {
  body: Joi.object().keys({
    user: Joi.string(),
    email: Joi.string().required().email(),
    orgName: Joi.string().optional().allow(''), // Allow empty string for orgName
    companyName: Joi.string().optional().allow(''),
    address1: Joi.string().optional().allow(''),
    address2: Joi.allow(null).optional().allow(''),
    wlIP: Joi.allow(null).optional(),
    phoneNumber: Joi.allow(null).required(),
    city: Joi.allow(null).optional().allow(''),
    zipCode: Joi.allow(null),
    country: Joi.allow(null).optional().allow(''),
    region: Joi.allow(null),
  }),
};
const membership = {
  body: Joi.object().keys({
    packageType: Joi.string().required(),
    id: Joi.string().optional(),
  }),
};
const companyInfo = {
  body: Joi.object().keys({
    email: Joi.string().required(),
  }),
};
const companyUpdate = {
  body: Joi.object().keys({
    formData: {
      storeName: Joi.string(),
      clientUrl: Joi.string(),
      storeDescription: Joi.string(),
      wlIp: Joi.string(),
    },
  }),
};
const storeUpdate = {
  body: Joi.object().keys({
    formData: {
      verificationStep: Joi.string(),
      packageType: Joi.string(),
      clientUrl: Joi.string(),
      user: Joi.string(),
      apiKey: Joi.string(),
      email: Joi.string().required().email(),
      orgName: Joi.string(),
      companyName: Joi.string(),
      address1: Joi.string(),
      address2: Joi.allow(null).optional(),
      phoneNumber: Joi.allow(null),
      city: Joi.string(),
      zipCode: Joi.allow(null),
      country: Joi.string(),
      region: Joi.allow(null),
    },
  }),
};
const keycodesetup = {
  body: Joi.object().keys({
    id: Joi.string().optional(),
    data: {
      // secret: Joi.string().required(),
      clientUrl: Joi.string().required(),
      // database: Joi.string().required(),
    },
  }),
};

module.exports = {
  registration,
  membership,
  keycodesetup,
  companyInfo,
  companyUpdate,
  storeUpdate,
};
