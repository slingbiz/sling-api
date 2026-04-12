const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const mongoUtil = require('./utils/mongoInit');

let server;

const startServer = async () => {
  await mongoUtil.connectToServer((err, db, dbGoose) => {
    if (err) {
      logger.error(`Failed to connect to DB, server starting without database: ${err.message}`);
    } else {
      app.db = db;
    }
    server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
    });
  });
};

startServer();

module.exports = app;

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(`Unexpected error: ${error}`);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
