const express = require('express');
const { pageRoutesController } = require('../../controllers');

const router = express.Router();
router.route('/').post(pageRoutesController.ping).get(pageRoutesController.ping);
router.route('/dash/getRoutes').post(pageRoutesController.getRoutes);

module.exports = router;
