const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const auditValidation = require('../../validations/audit.validation');
const auditController = require('../../controllers/audit.controller');

const router = express.Router();

router.route('/').get(auth(), validate(auditValidation.listAudit), auditController.listAudit);

module.exports = router;
