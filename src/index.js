const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const mongoUtil = require('./utils/mongoInit');

let server;

const startServer = async () => {
  try {
    await mongoUtil.connectToServer((err, db, dbGoose) => {
      if (err) {
        throw err;
      }
      app.db = db;
      server = app.listen(config.port, () => {
        logger.info(`Server is running on port ${config.port}`);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

startServer();

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
