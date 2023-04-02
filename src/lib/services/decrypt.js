const crypto = require('crypto');

module.exports = class Crypto {
  static decrypt(magicIv, magicNumber, magicString) {
    const bufferedMagicIv = Buffer.from(magicIv, 'hex');
    const bufferedMagicNumber = Buffer.from(magicNumber, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', bufferedMagicNumber, bufferedMagicIv);
    const decrypted = decipher.update(magicString, 'hex', 'utf8') + decipher.final('utf8');
    return decrypted;
  }
};
