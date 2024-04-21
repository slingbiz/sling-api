const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');

const mongoUtil = require('./utils/mongoInit');

let server;
mongoUtil.connectToServer(function (err, client) {
  app.db = client;
});
 

app.listen(config.port, () => {
  logger.info(`Listening to port ${config.port} & ${client}`);
});

module.exports = app;