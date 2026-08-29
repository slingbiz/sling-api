const LINK_IN_TEXT = /https?:\/\/|www\./i;

function userFieldContainsLink(key, value) {
  if (typeof value !== 'string') return false;
  if (key === 'password' || key === 'email') return false;
  return LINK_IN_TEXT.test(value);
}

function userBodyContainsLink(userBody) {
  return Object.entries(userBody || {}).some(([key, value]) =>
    userFieldContainsLink(key, value),
  );
}

module.exports = {
  userBodyContainsLink,
  userFieldContainsLink,
};
