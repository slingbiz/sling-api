const express = require('express');
const dashboardController = require('../../controllers/dashboard.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.route('/').post(dashboardController.ping).get(dashboardController.ping);
router.route('/ping').post(dashboardController.ping).get(dashboardController.ping);
router.route('/initConfig').post(auth(), dashboardController.initConfig).get(auth(), dashboardController.initConfig);
router.route('/getTemplates').post(auth(), dashboardController.getTemplates).get(auth(), dashboardController.getTemplates);

// TODO: Add middleware to authenticate client secret key
router.route('/setConfig').post(auth(), dashboardController.setConfig).get(auth(), dashboardController.setConfig);
router.route('/deletePageTemplate').post(auth(), dashboardController.deletePageTemplate);

module.exports = router;
