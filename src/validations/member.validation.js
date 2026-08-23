const Joi = require('joi');
const {password, objectId} = require('./custom.validation');

const invite = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    role: Joi.string().valid('user', 'publisher', 'admin').default('user'),
  }),
};

const accept = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().required(),
    password: Joi.string().required().custom(password),
  }),
};

const changeRole = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    role: Joi.string().required().valid('user', 'publisher', 'admin'),
  }),
};

const removeMember = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const revoke = {
  params: Joi.object().keys({
    inviteId: Joi.string().custom(objectId),
  }),
};

const getInvite = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

module.exports = {
  invite,
  accept,
  changeRole,
  removeMember,
  revoke,
  getInvite,
};
