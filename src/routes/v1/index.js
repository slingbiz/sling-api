const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const accountRoute = require('./account.route');
const dummyRoute = require('./dummy.route');
const dashboardRoute = require('./dashboard.route');
const widgetsRoute = require('./widgets.route');
const mediaRoute = require('./media.route');
const pageRoutes = require('./pageRoutes.route');
const frontendRoute = require('./frontend.route');
const docsRoute = require('./docs.route');
const inviteRoute = require('./invite.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/dummy',
    route: dummyRoute,
  },
  {
    path: '/invite',
    route: inviteRoute,
  },
  {
    path: '/dashboard',
    route: dashboardRoute,
  },
  {
    path: '/frontend',
    route: frontendRoute,
  },
  {
    path: '/widgets',
    route: widgetsRoute,
  },
  {
    path: '/media',
    route: mediaRoute,
  },
  {
    path: '/pageRoutes',
    route: pageRoutes,
  },
  {
    path: '/account',
    route: accountRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
