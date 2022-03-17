const express = require('express');
const {
  CompanyRegistrationForm,
  CompanyMembershipForm,
  CompanyKeyCodeSetupForm,
} = require('../../controllers/account.controller');
const validate = require('../../middlewares/validate');
const companyValidation = require('../../validations/company.validation');

const router = express.Router();
const setClient = require('../../middlewares/setClient');

router.post('/registration', setClient, validate(companyValidation.registration), CompanyRegistrationForm);
router.post('/membership', setClient, validate(companyValidation.membership), CompanyMembershipForm);
router.post('/keycodesetup', setClient, validate(companyValidation.keycodesetup), CompanyKeyCodeSetupForm);

module.exports = router;
