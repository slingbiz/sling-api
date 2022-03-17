const express = require('express');
const { accountForm1, accountForm2, accountForm3 } = require('../../controllers/account.controller');
const validate = require('../../middlewares/validate');

const router = express.Router();
const setClient = require('../../middlewares/setClient');

router.post('/form1', setClient, accountForm1);
router.post('/form2', setClient, accountForm2);
router.post('/form3', setClient, accountForm3);

module.exports = router;
