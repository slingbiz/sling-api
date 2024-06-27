// noinspection JSVoidFunctionReturnValueUsed

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const logger = require('../config/logger');

let _db;
let _dbGoose;

module.exports = {
  connectToServer(callback) {
    MongoClient.connect(process.env.MONGODB_URL, function (err, client) {
      if (err) {
        logger.error(`Failed to connect to the database. ${err.stack}`);
        process.exit(1);
      } else {
        logger.info('Connected to MongoDB');
        _db = client.db(process.env.MONGODB_DB || 'sling');

        // Add dbGoose
        _dbGoose = mongoose.connect(
          process.env.MONGODB_URL,
          function (err2, gooseDb) {
            if (err2) {
              logger.error(`Failed to connect to the database. ${err.stack}`);
              process.exit(1);
            } else {
              logger.info('Connected to MongoDB');
              mongoose.pluralize(null);
              _dbGoose = gooseDb;
              return callback(err, _db, _dbGoose);
            }
          }
        );
      }
    });
  },

  getDb(goose) {
    if (goose) {
      return _dbGoose;
    }
    return _db;
  },
};
