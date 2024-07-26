const { getDb } = require('../utils/mongoInit');

const setClientFE = async (req, res, next) => {
  try {
    const clientId = req.header('client');
    const license = req.header('license');
    const db = getDb();

    if (!clientId || !license) {
      return res.status(400).json({
        error: {
          message: 'Unauthenticated Access. Please contact admin.',
        },
      });
    }

    // Validate secret
    const user = (await db.collection('client_meta').findOne({ apiKey: license })) || {};
    if (!user._id) {
      return res.status(400).json({
        error: {
          message: 'Invalid Secret key. Please contact admin.',
        },
      });
    }

    // If secret
    // Validate secret end
    // Validate token & Email id. If not valid. Return with error.
    if (user.email !== clientId) {
      console.log('[setClientFe] - [Invalid Secret Key or Client Id. Please contact admin]', clientId, user.email);
      return res.status(400).json({
        error: {
          message: 'Invalid Secret Key or Client Id. Please contact admin.',
        },
      });
    }
    // Else set clientId in the req.
    req.clientId = clientId || 'demo-id';

    // call next middleware in the stack

    next();
  } catch (error) {
    console.log(error.message, 'Exception @setClientFe ');
    return res.status(500).json({
      error,
    });
  }
};

module.exports = setClientFE;
