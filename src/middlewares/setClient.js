const setClient = (req, res, next) => {
  const token = req.header('authorization');
  // Validate token
  const clientId = req.header('client');
  console.log('@setClient', clientId);
  const licenseKey = req.header('license');

  // look up the user based on the token
  // TODO: Validate authenticity of api requests for clients.
  // const user = getUserFromToken(token).then((user) => {
  //   // append the user object the the request object
  //   req.user = user;
  //
  //   // call next middleware in the stack
  //   next();
  // });
  req.clientId = clientId || 'demo-id';

  // call next middleware in the stack
  next();
};

module.exports = setClient;
