const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  skipSuccessfulRequests: false, // Count successful requests against the rate limit
  message: 'Too many requests from this IP, please try again later',
});

module.exports = {
  rateLimiter,
};
