const express = require('express');
const frontendController = require('../../controllers/frontend.controller');
const setClientFE = require('../../middlewares/setClientFE');

const router = express.Router();

router.route('/getInitProps').post(setClientFE, frontendController.getInitProps);

module.exports = router;
