const express = require('express');
const dummyController = require('../../controllers/dummy.controller');

const router = express.Router();

router.route('/').post(dummyController.ping).get(dummyController.ping);
router.route('/ping').post(dummyController.ping).get(dummyController.ping);
router.route('/initConfig').post(dummyController.initConfig).get(dummyController.initConfig);

module.exports = router;
