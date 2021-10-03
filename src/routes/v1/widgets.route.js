const express = require('express');
const { widgetsController } = require('../../controllers');

const router = express.Router();

router.route('/').post(widgetsController.ping).get(widgetsController.ping);
router.route('/dash/getWidgets').post(widgetsController.getWidgets);

module.exports = router;
