const express = require('express');
const inviteController = require('../../controllers/invite.controller');
const router = express.Router();

router.route('/').post(inviteController.ping).get(inviteController.ping);
router.route('/signMeUp').post(inviteController.signMeUp);

module.exports = router;
