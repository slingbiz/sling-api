const crypto = require('crypto');
const httpStatus = require('http-status');
const { OAuth2Client } = require('google-auth-library');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { getDb } = require('../utils/mongoInit');
const config = require('../config/config');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, '[Sling] Incorrect email or password');
  }
  if (user.authProvider === 'google') {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      '[Sling] This account uses Google sign-in. Please use “Continue with Google”.',
    );
  }
  if (!(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, '[Sling] Incorrect email or password');
  }
  return user;
};

/**
 * Verify Google ID token, then sign in or create user (Sign in with Google).
 * @param {string} idToken
 * @returns {Promise<{ user: import('../models/user.model'), tokens: object, isNewUser: boolean }>}
 */
const loginOrRegisterWithGoogleIdToken = async (idToken) => {
  if (!config.google?.clientId) {
    throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Google sign-in is not configured on this server');
  }

  const client = new OAuth2Client(config.google.clientId);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });
  } catch (e) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired Google sign-in');
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Google account has no email');
  }

  const email = payload.email.trim().toLowerCase();
  const googleSub = payload.sub;
  const name = (payload.name || email.split('@')[0]).trim().slice(0, 120);
  const verified = payload.email_verified === true;

  let user = await User.findOne({ $or: [{ googleSub }, { email }] });
  let isNewUser = false;

  if (user) {
    if (user.googleSub && user.googleSub !== googleSub) {
      throw new ApiError(
        httpStatus.CONFLICT,
        'This email is already linked to a different Google account.',
      );
    }
    const updates = {};
    if (!user.googleSub) {
      updates.googleSub = googleSub;
    }
    if (verified && !user.isEmailVerified) {
      updates.isEmailVerified = true;
    }
    if (Object.keys(updates).length) {
      Object.assign(user, updates);
      await user.save();
    }
  } else {
    isNewUser = true;
    const randomPw = `Gg9${crypto.randomBytes(28).toString('hex')}`;
    user = await userService.createUser({
      name,
      email,
      password: randomPw,
      authProvider: 'google',
      googleSub,
      isEmailVerified: verified,
    });
  }

  const tokens = await tokenService.generateAuthTokens(user);
  return { user, tokens, isNewUser };
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await Token.deleteOne({ _id: refreshTokenDoc._id });
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

/**
 * Tick
 * @returns {Promise}
 */
const tick = async (requestBody) => {
  const db = getDb();
  if (!requestBody.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is required');
  }
  // make sure unique email is ticked
  const ticked = await db.collection('tick').findOne({ email: requestBody.email });
  if (ticked) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already ticked');
  }
  const res = await db.collection('tick').insertOne({ email: requestBody.email, time: new Date() });
  return res;
};

module.exports = {
  loginUserWithEmailAndPassword,
  loginOrRegisterWithGoogleIdToken,
  logout,
  tick,
  refreshAuth,
  resetPassword,
  verifyEmail,
};
