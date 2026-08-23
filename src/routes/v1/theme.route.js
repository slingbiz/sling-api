const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const themeValidation = require('../../validations/theme.validation');
const themeController = require('../../controllers/theme.controller');

const router = express.Router();

router
  .route('/')
  .get(auth(), themeController.getTheme)
  .put(auth(), validate(themeValidation.setTheme), themeController.setTheme)
  .post(auth(), validate(themeValidation.setTheme), themeController.setTheme);

module.exports = router;
