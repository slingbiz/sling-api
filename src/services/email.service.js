const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const mailjet = require('node-mailjet');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  try {
    const msg = { from: config.email.from, to, subject, text };
    await transport.sendMail(msg);
  } catch (e) {
    console.log(e.message, '[sendEmail] Exception');
  }
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `https://sling.biz/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `${process.env.EMAIL_VERIFY_URL}?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

const sendVerificationEmailByToken = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  // const verificationEmailUrl = `http://localhost:10001/v1/auth/verify-email?token=${token}`;
  const verificationEmailUrl = `${process.env.EMAIL_VERIFY_URL}?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

// Function to send a welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      return;
    }
    const mailjetClient = mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);

    // Load the email template from file
    const emailTemplatePath = path.join(__dirname, '../utils/EmailTemplates/welcome.html');
    let emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');

    // Replace <UserName> in the email template with the actual user's name
    emailTemplate = emailTemplate.replace('<UserName>', userName);

    // Prepare and send the email via Mailjet
    const request = mailjetClient.post('send', { version: 'v3' });
    const result = await request.request({
      FromEmail: 'hello@sling.biz', // Replace with your sender email
      FromName: 'Sling Team',
      Recipients: [
        {
          Email: userEmail,
          Name: userName,
        },
      ],
      Subject: 'Welcome to Sling!',
      'Text-part': `Hi ${userName}, welcome to Sling! We're excited to have you on board.`,
      'Html-part': emailTemplate, // HTML email content
    });

    // Send a compy to Admin. T
    // Todo: BCC issue to be fixed.
    if (process.env.BCC_EMAIL) {
      request.request({
        FromEmail: 'hello@sling.biz', // Replace with your sender email
        FromName: 'Sling Team',
        Recipients: [
          {
            Email: process.env.BCC_EMAIL,
            Name: userName,
          },
        ],
        Subject: 'Welcome to Sling!',
        'Text-part': `Hi ${userName}, welcome to Sling! We're excited to have you on board.`,
        'Html-part': emailTemplate, // HTML email content
      });
    }

    console.log('Email sent:', result.body);
  } catch (err) {
    console.error('Error sending email:', err.statusCode);
  }
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendVerificationEmailByToken,
  sendWelcomeEmail,
};
