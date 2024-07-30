const express = require('express');
const { pageRoutesController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();
router.route('/').post(pageRoutesController.ping).get(pageRoutesController.ping);
router.route('/dash/getRoutes').post(auth(), pageRoutesController.getRoutes);
router.route('/saveRoute').post(auth(), pageRoutesController.saveRoute);

// Add delete and update routes
router.route('/delete/:id').post(auth(), pageRoutesController.deleteRoute);
router.route('/update').post(auth(), pageRoutesController.updateRoute);

module.exports = router;
