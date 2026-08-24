const Joi = require('joi');

const listAudit = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(0),
    size: Joi.number().integer().min(1).max(200),
    action: Joi.string().trim().max(80),
    resourceType: Joi.string().trim().max(80),
    resourceId: Joi.string().trim().max(80),
    q: Joi.string().trim().allow('').max(200),
  }),
};

module.exports = {
  listAudit,
};
