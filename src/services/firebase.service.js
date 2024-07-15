/** ***************************************************************************
 *                                                                           *
 *                D E P R E C A T E D   F I L E   C O N T E N T              *
 *                                                                           *
 * ------------------------------------------------------------------------- *
 *  This file's content is deprecated and is no longer maintained.           *
 *  Please refer to the updated version or other relevant files for          *
 *  the most recent and supported code.                                       *
 *                                                                           *
 *  If you have any questions or need further assistance, please contact     *
 *  the development team or refer to the project documentation.              *
 *                                                                           *
 **************************************************************************** */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_AUTH_DB_URL,
  });
}

module.exports = {
  admin,
};
