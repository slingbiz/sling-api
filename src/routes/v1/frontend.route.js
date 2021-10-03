const express = require('express');
const frontendController = require('../../controllers/frontend.controller');

const router = express.Router();

// TODO: Add middleware to authenticate client secret key
router.route('/getInitProps').post(frontendController.getInitProps);

module.exports = router;
