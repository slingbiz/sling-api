const express = require('express');
const dashboardController = require('../../controllers/dashboard.controller');

const router = express.Router();

router.route('/').post(dashboardController.ping).get(dashboardController.ping);
router.route('/ping').post(dashboardController.ping).get(dashboardController.ping);
router.route('/initConfig').post(dashboardController.initConfig).get(dashboardController.initConfig);
router.route('/setConfig').post(dashboardController.setConfig).get(dashboardController.setConfig);

module.exports = router;
