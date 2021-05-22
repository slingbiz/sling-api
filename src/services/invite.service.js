const { getDb } = require('../utils/mongoInit');
/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const signMeUp = async (body) => {
  // Save in Mongo
  const db = getDb();
  let resSave = {};
  try {
    await db.collection('early_access').insertOne(body);
    resSave = { status: true, msg: 'Request saved successfully. One of our representatives will get back to you shortly.' };
  } catch (e) {
    console.log(e.message, '@signMeUp Service');
    resSave = { status: false, msg: e.message };
  }
  return resSave;
};

module.exports = {
  signMeUp,
};
