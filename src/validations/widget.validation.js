const Joi = require('joi');
const { objectId } = require('./custom.validation');

const submitForReview = {
  params: Joi.object().keys({
    widgetId: Joi.string().required().custom(objectId),
  }),
};

const reviewWidget = {
  params: Joi.object().keys({
    widgetId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    action: Joi.string().required().valid('approve', 'reject'),
    notes: Joi.string().allow('', null),
  }),
};

const publishWidget = {
  params: Joi.object().keys({
    widgetId: Joi.string().required().custom(objectId),
  }),
};

const generateWidget = {
  body: Joi.object().keys({
    prompt: Joi.string().required().min(10).max(2000),
    themeConfig: Joi.object().optional(),
  }),
};

const listVersions = {
  params: Joi.object().keys({
    widgetId: Joi.string().required().custom(objectId),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(0),
    size: Joi.number().integer().min(1).max(50),
  }),
};

const getVersion = {
  params: Joi.object().keys({
    widgetId: Joi.string().required().custom(objectId),
    versionId: Joi.string().required().custom(objectId),
  }),
};

const revertVersion = {
  params: Joi.object().keys({
    widgetId: Joi.string().required().custom(objectId),
    versionId: Joi.string().required().custom(objectId),
  }),
};

module.exports = {
  submitForReview,
  reviewWidget,
  publishWidget,
  generateWidget,
  listVersions,
  getVersion,
  revertVersion,
};
