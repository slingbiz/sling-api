const httpStatus = require('http-status');
// const { Account } = require('../models');
const Account = require('../models/account.model');
const ApiError = require('../utils/ApiError');

const accountForm1Registration = async (formData) => {
  if (await Account.isEmailTaken(formData.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${formData.email} Email already taken`);
  }
  const form1 = await Account.create(formData);
  return form1;
};
const accountForm2Registration = async (userId, data) => {
  console.log(userId, data);
  const query = { user: userId };

  const form2 = await Account.findOneAndUpdate(query, { packageType: data }, { new: true });
  return form2;
};
const accountForm3Registration = async (userId, formData) => {
  console.log(userId, formData);
  const query = { user: userId };

  const form3 = await Account.findOneAndUpdate(query, formData, { new: true });
  return form3;
};

module.exports = {
  accountForm1Registration,
  accountForm2Registration,
  accountForm3Registration,
};
