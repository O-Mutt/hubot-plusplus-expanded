const crypto = require('crypto');

const algorithm = 'aes-256-cbc';

function decrypt(inputIv, magicNumber, magicString) {
  const magicIv = Buffer.from(inputIv, 'hex');
  const magicKey = Buffer.from(magicNumber, 'hex');
  const encryptedText = Buffer.from(magicString, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, magicKey, magicIv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports = decrypt;
