const express = require('express');
const { auth } = require('firebase-admin');
const { widgetsController } = require('../../controllers');
const setClient = require('../../middlewares/setClient');

const router = express.Router();

// router.route('/').post(widgetsController.ping).get(widgetsController.ping);
router.post('/', setClient, widgetsController.createWidget);
router.put('/', setClient, widgetsController.updateWidget);
router.get('/', setClient, widgetsController.getWidgets);

module.exports = router;
