const crypto = require('crypto');

const generateOTP = () => {
  return String(crypto.randomInt(100000, 999999));
};

module.exports = { generateOTP };
