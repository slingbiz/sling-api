const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const logger = require('../config/logger');

let _db;
let _dbGoose;

module.exports = {
  async connectToServer(callback) {
    try {
      const client = await MongoClient.connect(process.env.MONGODB_URL);
      logger.info('Connected to MongoDB');
      _db = client.db(process.env.MONGODB_DB || 'sling');

      // Connect mongoose separately
      await mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      mongoose.pluralize(null); // Disable pluralization of collection names
      _dbGoose = mongoose.connection;

      callback(null, _db, _dbGoose);
    } catch (err) {
      logger.error(`Failed to connect to the database: ${err.stack}`);
      process.exit(1);
    }
  },

  getDb(goose) {
    return goose ? _dbGoose : _db;
  },
};
