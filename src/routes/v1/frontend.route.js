const express = require('express');
const frontendController = require('../../controllers/frontend.controller');
const setClientFE = require('../../middlewares/setClientFE');
const { widgetsController, dummyController } = require('../../controllers');

const router = express.Router();

router.route('/getInitProps').post(setClientFE, frontendController.getInitProps);
router.route('/pinggg').post(dummyController.ping).get(dummyController.ping);
router.route('/pinggg2').post(setClientFE, dummyController.ping).get(dummyController.ping);

// Widget Registry
router.route('/widgets').post(setClientFE, widgetsController.createWidget);
router.route('/widgets').put(setClientFE, widgetsController.updateWidget);
router.route('/updateWidgetByKey').put(setClientFE, widgetsController.updateWidgetByKey);
router.route('/getWidgets').post(setClientFE, widgetsController.getWidgets);

module.exports = router;
