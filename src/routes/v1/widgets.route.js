const express = require('express');
const { widgetsController } = require('../../controllers');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const widgetValidation = require('../../validations/widget.validation');

const router = express.Router();

// router.route('/').post(widgetsController.ping).get(widgetsController.ping);
router.post('/', auth(), widgetsController.createWidget);
router.put('/', auth(), widgetsController.updateWidget);
// router.get('/', setClient, widgetsController.getWidgets);
router.route('/dash/getWidgets').post(auth(), widgetsController.getWidgets);
router.route('/getWidgets').post(auth(), widgetsController.getWidgets);
router.route('/deleteWidget').post(auth(), widgetsController.deleteWidget);

// Widget governance workflow: any authenticated tenant member can submit
// their own draft for review, but only an admin (reviewWidgets right) can
// approve/reject or publish.
router
  .route('/:widgetId/submit-for-review')
  .post(auth(), validate(widgetValidation.submitForReview), widgetsController.submitWidgetForReview);
router
  .route('/:widgetId/review')
  .post(auth('reviewWidgets'), validate(widgetValidation.reviewWidget), widgetsController.reviewWidget);
router
  .route('/:widgetId/publish')
  .post(auth('reviewWidgets'), validate(widgetValidation.publishWidget), widgetsController.publishWidget);

module.exports = router;
