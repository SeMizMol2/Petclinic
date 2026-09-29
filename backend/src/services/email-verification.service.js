const { randomBytes, createHash } = require('node:crypto');
const { sendEmailVerification } = require('./mail.service');

const makeVerificationToken = () => {
  const token = randomBytes(32).toString('hex');
  return { token, hash: createHash('sha256').update(token).digest('hex') };
};

const hashVerificationToken = (token) => createHash('sha256').update(token).digest('hex');

const deliverVerification = async ({ email, username, token }) => {
  const result = await sendEmailVerification({ email, username, token });
  return Boolean(result.sent);
};

module.exports = { makeVerificationToken, hashVerificationToken, deliverVerification };
