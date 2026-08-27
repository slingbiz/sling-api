const express = require('express');
const auth = require('../../middlewares/auth');
const aiController = require('../../controllers/ai.controller');

const router = express.Router();

router.post('/page/generate', auth(), aiController.generatePage);
router.post('/page/generate/stream', auth(), aiController.streamPage);
router.post('/widget/generate', auth(), aiController.generateWidget);
router.post('/widget/generate/stream', auth(), aiController.streamWidget);

module.exports = router;
