const Joi = require('joi');

const registration = {
  body: Joi.object().keys({
    user: Joi.string(),
    email: Joi.string().required().email(),
    orgName: Joi.string().required(),
    companyName: Joi.string().required(),
    address1: Joi.string().required(),
    address2: Joi.allow(null).optional(),
    phoneNumber: Joi.allow(null).required(),
    city: Joi.string().required(),
    zipCode: Joi.allow(null),
    country: Joi.string().required(),
    region: Joi.allow(null),
  }),
};
const membership = {
  body: Joi.object().keys({
    packageType: Joi.string().required(),
    // id: Joi.string().required(),
  }),
};
const keycodesetup = {
  body: Joi.object().keys({
    // id: Joi.string().required(),
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
};
