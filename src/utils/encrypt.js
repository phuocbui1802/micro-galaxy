const crypto = require('crypto');
const ENCRYPT_TYPE = 'sha512';

const encryptUtil = {
  generateHash: (originalText) => {
    const hashedText = crypto.createHmac(ENCRYPT_TYPE, originalText)
      .update(originalText)
      .digest('hex');
    return hashedText;
  },

  generateHashPassword: (plainPassword) => {
    return plainPassword;
  },

  generateSHA1StringInBase64: (originalText) => {
    const hashedText = crypto.createHash('sha1')
      .update(originalText)
      .digest('base64');
    return hashedText;
  }
};

module.exports = encryptUtil;
