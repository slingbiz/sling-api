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
const auth = require('../../middlewares/auth');

router.post('/registration', auth(), validate(companyValidation.registration), CompanyRegistrationForm);
router.post('/membership', auth(), validate(companyValidation.membership), CompanyMembershipForm);
router.post('/keycodesetup', auth(), validate(companyValidation.keycodesetup), CompanyKeyCodeSetupForm);
router.post('/getcompanyinfo', auth(), validate(companyValidation.companyInfo), GetCompanyInformation);
router.post('/updatecompanyinfo', auth(), validate(companyValidation.companyUpdate), UpdateCompanyInformation);
router.post('/updatestoreinfo', auth(), validate(companyValidation.storeUpdate), UpdateStoreInformation);
router.post('/companyInitialize', auth(), InitializeCompanySetup);

module.exports = router;
