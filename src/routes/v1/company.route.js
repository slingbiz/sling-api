const express = require('express');
const {
  CompanyRegistrationForm,
  CompanyMembershipForm,
  CompanyKeyCodeSetupForm,
} = require('../../controllers/account.controller');
const validate = require('../../middlewares/validate');
const companyValidation = require('../../validations/company.validation');

const router = express.Router();
const auth = require('../../middlewares/auth');

router.post('/registration', auth(), validate(companyValidation.registration), CompanyRegistrationForm);
router.post('/membership', auth(), validate(companyValidation.membership), CompanyMembershipForm);
router.post('/keycodesetup', auth(), validate(companyValidation.keycodesetup), CompanyKeyCodeSetupForm);

module.exports = router;
