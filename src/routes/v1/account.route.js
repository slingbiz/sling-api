const express = require('express');
const { accountForm1, accountForm2, accountForm3 } = require('../../controllers/account.controller');
const validate = require('../../middlewares/validate');
const router = express.Router();
const auth = require('../../middlewares/auth');

router.post('/form1', auth(), accountForm1);
router.post('/form2', auth(), accountForm2);
router.post('/form3', auth(), accountForm3);

module.exports = router;
