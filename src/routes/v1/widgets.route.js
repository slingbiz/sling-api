const express = require('express');
const { widgetsController } = require('../../controllers');
const setClient = require('../../middlewares/setClient');

const router = express.Router();

router.route('/').post(widgetsController.ping).get(widgetsController.ping);
router.route('/dash/getWidgets').post(setClient, widgetsController.getWidgets);

module.exports = router;
