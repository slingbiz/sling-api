const admin = require('firebase-admin');

const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://upwork-75d81-default-rtdb.firebaseio.com',
});

module.exports = {
  admin,
};
