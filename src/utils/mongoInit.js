const { MongoClient } = require('mongodb');

const logger = require('../config/logger');

let _db;

module.exports = {
  connectToServer(callback) {
    MongoClient.connect(process.env.MONGODB_URL, function (err, client) {
      if (err) {
        logger.error(`Failed to connect to the database. ${err.stack}`);
        process.exit(1);
      } else {
        logger.info('Connected to MongoDB');
        _db = client.db(process.env.MONGODB_DB || 'sling');
        return callback(err, _db);
      }
    });
  },

  getDb() {
    return _db;
  },
};
