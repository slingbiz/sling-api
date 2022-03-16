const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const logger = require('../config/logger');

let _db;

module.exports = {
  connectToServer(callback) {
    _db = mongoose.connect(
      process.env.MONGODB_URL,
      { useNewUrlParser: true, useUnifiedTopology: true },
      function (err, client) {
        if (err) {
          logger.error(`Failed to connect to the database. ${err.stack}`);
          process.exit(1);
        } else {
          logger.info('Connected to MongoDB');
          mongoose.pluralize(null);

          //  = client.db(process.env.MONGODB_DB || 'sling');
          return callback(err, _db);
        }
      }
    );
  },

  getDb() {
    return _db;
  },
};
