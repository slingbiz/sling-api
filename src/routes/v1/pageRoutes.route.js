const express = require('express');
const { pageRoutesController } = require('../../controllers');
const setClient = require('../../middlewares/setClient');

const router = express.Router();
router.route('/').post(pageRoutesController.ping).get(pageRoutesController.ping);
router.route('/dash/getRoutes').post(setClient, pageRoutesController.getRoutes);
router.route('/saveRoute').post(setClient, pageRoutesController.saveRoute);

module.exports = router;
