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

// Local dev: start a traditional HTTP server
if (process.env.NODE_ENV !== 'production') {
  startServer();
}

// Serverless (Vercel): ensure DB is connected before each request
// Connection is cached across invocations in the same instance
let _connectionPromise = null;

const ensureDB = () => {
  if (_connectionPromise) return _connectionPromise;
  _connectionPromise = new Promise((resolve) => {
    mongoUtil.connectToServer((err, db) => {
      if (err) {
        logger.error(`DB connection failed: ${err.message}`);
        _connectionPromise = null; // allow retry on next request
      } else {
        app.db = db;
        logger.info('DB connected');
      }
      resolve();
    });
  });
  return _connectionPromise;
};

module.exports = async (req, res) => {
  await ensureDB();
  return app(req, res);
};

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
