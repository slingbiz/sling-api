const express = require('express');
const { widgetsController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

// router.route('/').post(widgetsController.ping).get(widgetsController.ping);
router.post('/', auth(), widgetsController.createWidget);
router.put('/', auth(), widgetsController.updateWidget);
// router.get('/', setClient, widgetsController.getWidgets);
router.route('/dash/getWidgets').post(auth(), widgetsController.getWidgets);
router.route('/getWidgets').post(auth(), widgetsController.getWidgets);
router.route('/deleteWidget').post(auth(), widgetsController.deleteWidget);

module.exports = router;
