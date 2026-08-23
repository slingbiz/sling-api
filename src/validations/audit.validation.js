const Joi = require('joi');

const listAudit = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(0),
    size: Joi.number().integer().min(1).max(200),
  }),
};

module.exports = {
  listAudit,
};
