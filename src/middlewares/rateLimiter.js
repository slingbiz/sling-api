const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';
const envMax = Number(process.env.RATE_LIMIT_MAX);
const max = Number.isFinite(envMax) && envMax > 0 ? envMax : 2000;

// Local Studio + storefront boot can fire hundreds of calls (widget register, iframes).
// 50 / 15 min was starving that and surfacing as 429 / empty site.
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  skip: () => isDev,
  skipSuccessfulRequests: false,
  message: 'Too many requests from this IP, please try again later',
});

module.exports = {
  rateLimiter,
};
