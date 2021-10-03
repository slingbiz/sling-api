const express = require('express');
const { mediaController } = require('../../controllers');

const router = express.Router();
router.route('/').post(mediaController.ping).get(mediaController.ping);
router.route('/dash/getMedia').post(mediaController.getMedia);
router.route('/dash/getMediaConstants').post(mediaController.getMediaConstants);

module.exports = router;
