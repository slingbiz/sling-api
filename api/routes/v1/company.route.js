const express = require('express');
const {
  CompanyRegistrationForm,
  CompanyMembershipForm,
  CompanyKeyCodeSetupForm,
  GetCompanyInformation,
  UpdateCompanyInformation,
  UpdateStoreInformation,
  InitializeCompanySetup,
} = require('../../controllers/account.controller');
const validate = require('../../middlewares/validate');
const companyValidation = require('../../validations/company.validation');

const router = express.Router();
const setClient = require('../../middlewares/setClient');

router.post('/registration', setClient, validate(companyValidation.registration), CompanyRegistrationForm);
router.post('/membership', setClient, validate(companyValidation.membership), CompanyMembershipForm);
router.post('/keycodesetup', setClient, validate(companyValidation.keycodesetup), CompanyKeyCodeSetupForm);
router.post('/getcompanyinfo', setClient, validate(companyValidation.companyInfo), GetCompanyInformation);
router.post('/updatecompanyinfo', setClient, validate(companyValidation.companyUpdate), UpdateCompanyInformation);
router.post('/updatestoreinfo', setClient, validate(companyValidation.storeUpdate), UpdateStoreInformation);
router.post('/companyInitialize', setClient, InitializeCompanySetup);

module.exports = router;
