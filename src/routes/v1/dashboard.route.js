const express = require('express');
const dashboardController = require('../../controllers/dashboard.controller');
const setClient = require('../../middlewares/setClient');

const router = express.Router();

router.route('/').post(dashboardController.ping).get(dashboardController.ping);
router.route('/ping').post(dashboardController.ping).get(dashboardController.ping);
router.route('/initConfig').post(setClient, dashboardController.initConfig).get(setClient, dashboardController.initConfig);
router
  .route('/getTemplates')
  .post(setClient, dashboardController.getTemplates)
  .get(setClient, dashboardController.getTemplates);

// TODO: Add middleware to authenticate client secret key
router.route('/setConfig').post(setClient, dashboardController.setConfig).get(setClient, dashboardController.setConfig);

module.exports = router;
