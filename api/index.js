const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');

const mongoUtil = require('./utils/mongoInit');

// Import and configure the serverless-mongodb package
const { MongoClient } = require('mongodb');

// Define the serverless function
module.exports = async (req, res) => {
  try {
    // Establish MongoDB connection using custom function
    mongoUtil.connectToServer(async function (err, client) {
      if (err) {
        console.error('Error connecting to MongoDB:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Set the MongoDB client in the app object for use in routes
      app.db = client;

      // Handle incoming HTTP requests using the Express app
      app(req, res);
    });
  } catch (error) {
    // Handle errors
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
