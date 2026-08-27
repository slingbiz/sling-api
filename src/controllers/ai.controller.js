const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { pageGenerateService, widgetGenerateService, generateQuotaService } = require('../services');

const promptTooShort = (prompt) => !prompt || typeof prompt !== 'string' || prompt.trim().length < 5;

const mapGenerateError = (err) => {
  if (err instanceof ApiError) {
    return err;
  }
  const status = err.code === 'GEMINI_NOT_CONFIGURED' ? httpStatus.INTERNAL_SERVER_ERROR : httpStatus.BAD_GATEWAY;
  return new ApiError(status, err.message || 'Generation failed');
};

const sendSse = (res) => (data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const openSse = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
};

const generatePage = catchAsync(async (req, res) => {
  const { prompt, themeConfig, followUp, previous } = req.body;
  if (promptTooShort(prompt)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prompt must be at least 5 characters.');
  }
  await generateQuotaService.consumeGenerateQuota(req.clientId);
  try {
    const result = await pageGenerateService.generatePage(prompt.trim(), themeConfig, { followUp, previous });
    res.status(httpStatus.OK).send(result);
  } catch (err) {
    throw mapGenerateError(err);
  }
});

const streamPage = catchAsync(async (req, res) => {
  const { prompt, themeConfig, followUp, previous } = req.body;
  if (promptTooShort(prompt)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prompt must be at least 5 characters.');
  }
  await generateQuotaService.consumeGenerateQuota(req.clientId);
  openSse(res);
  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });
  const send = (data) => {
    if (!aborted) sendSse(res)(data);
  };
  try {
    await pageGenerateService.streamPage(prompt.trim(), themeConfig, send, { followUp, previous });
  } catch (err) {
    send({ type: 'error', message: err.message });
  }
  if (!aborted) res.end();
});

const generateWidget = catchAsync(async (req, res) => {
  const { prompt, themeConfig } = req.body;
  if (promptTooShort(prompt)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prompt must be at least 5 characters.');
  }
  await generateQuotaService.consumeGenerateQuota(req.clientId);
  try {
    const result = await widgetGenerateService.generateWidget(prompt.trim(), themeConfig);
    res.status(httpStatus.OK).send(result);
  } catch (err) {
    throw mapGenerateError(err);
  }
});

const streamWidget = catchAsync(async (req, res) => {
  const { prompt, themeConfig } = req.body;
  if (promptTooShort(prompt)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prompt must be at least 5 characters.');
  }
  await generateQuotaService.consumeGenerateQuota(req.clientId);
  openSse(res);
  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });
  const send = (data) => {
    if (!aborted) sendSse(res)(data);
  };
  try {
    send({ type: 'status', message: 'Generating widget...' });
    await widgetGenerateService.streamWidget(prompt.trim(), themeConfig, send);
  } catch (err) {
    send({ type: 'error', message: err.message });
  }
  if (!aborted) res.end();
});

module.exports = {
  generatePage,
  streamPage,
  generateWidget,
  streamWidget,
};
