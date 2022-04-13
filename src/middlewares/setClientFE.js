const setClientFE = async (req, res, next) => {
  try {
    const clientId = req.header('client');
    const license = req.header('license');
    console.log(license, clientId, 'setClientFE');

    if (!clientId || !license) {
      return res.status(400).json({
        error: {
          message: 'Unauthenticated Access. Please contact admin.',
        },
      });
    }

    // Validate secret

    // If secret
    // Validate secret end

    // Validate token & Email id. If not valid. Return with error.
    // Else set clientId in the req.
    req.clientId = clientId || 'demo-id';

    // call next middleware in the stack

    next();
  } catch (error) {
    return res.status(500).json({
      error,
    });
  }
};

module.exports = setClientFE;
