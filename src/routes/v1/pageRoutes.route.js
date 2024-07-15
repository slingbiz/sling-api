const express = require('express');
const { pageRoutesController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();
router.route('/').post(pageRoutesController.ping).get(pageRoutesController.ping);
router.route('/dash/getRoutes').post(auth(), pageRoutesController.getRoutes);
router.route('/saveRoute').post(auth(), pageRoutesController.saveRoute);

module.exports = router;
