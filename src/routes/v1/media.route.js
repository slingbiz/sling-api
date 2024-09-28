const express = require('express');
const multer = require('multer');
const { mediaController } = require('../../controllers');
const auth = require('../../middlewares/auth');

// Setup Multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
});
const router = express.Router();
router.route('/').post(mediaController.ping).get(mediaController.ping);
router.route('/dash/getMedia').post(auth(), mediaController.getMedia);
router.route('/dash/getMediaConstants').post(auth(), mediaController.getMediaConstants);
router.route('/saveImage').post(auth(), upload.single('file'), mediaController.saveImage);
router.route('/uploadImage').post(auth(), upload.single('file'), mediaController.uploadImage);

module.exports = router;
