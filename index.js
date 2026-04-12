const app = require('./src/app');
const mongoUtil = require('./src/utils/mongoInit');
const logger = require('./src/config/logger');

// Connect to MongoDB on cold start (non-blocking — function stays alive even if DB is unreachable)
mongoUtil.connectToServer((err, db) => {
  if (err) {
    logger.error(`Serverless cold start: DB connection failed — ${err.message}`);
  } else {
    app.db = db;
    logger.info('Serverless cold start: DB connected');
  }
});

module.exports = app;
