const { admin } = require('../services/firebase.service');

const setClient = async (req, res, next) => {
  try {
    const token = req.header('authorization');
    if (!token) {
      return res.status(400).json({
        error: {
          message: 'Unauthenticated Access. Please contact admin.',
        },
      });
    }
    // Validate token
    const user = await admin.auth().verifyIdToken(token);
    req.user = user;

    // Verify client
    const clientId = req.header('client') ;
    const licenseKey = req.header('license');
    // console.log('client ID & license key', clientId, licenseKey, token);

    req.clientId = user.email || clientId || 'demo-id';

    // call next middleware in the stack
    next();
  } catch (error) {
    return res.status(500).json({
      error,
    });
  }
};

module.exports = setClient;
