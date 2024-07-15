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

const { admin } = require('../services/firebase.service');

const setClient = async (req, res, next) => {
  try {
    let token = req.header('authorization');
    if (!token) {
      return res.status(400).json({
        error: {
          message: 'Unauthenticated Access. Please contact admin.',
        },
      });
    }
    /// / Remove Bearer
    token = token?.replace('Bearer ', '');
    // Validate token
    const user = await admin.auth().verifyIdToken(token);
    req.user = user;
    // req.body = { ...req.body, user: user.id };
    req.token = token;

    // Verify client
    const clientId = req.header('client');
    const licenseKey = req.header('license');
    // console.log('client ID & license key', clientId, licenseKey, token);

    req.clientId = user.email || clientId || 'demo-id';

    // call next middleware in the stack
    next();
  } catch (error) {
    console.log(error.message, 'errorerror');
    return res.status(500).json({
      error,
    });
  }
};

module.exports = setClient;
