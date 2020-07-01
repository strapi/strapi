const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const publicKey = fs.readFileSync(path.join(__dirname, '../utils/resources/key.pub'));

const defaultLogger = {
  warn: console.warn.bind(console),
  info: console.log.bind(console),
};

module.exports = ({ dir, logger = defaultLogger }) => {
  const warnAndReturn = (msg = 'Invalid license. Starting in CE.') => {
    logger.warn(msg);
    return false;
  };

  const licensePath = path.join(dir, 'license.txt');

  let license;
  if (process.env.STRAPI_LICENSE) {
    license = process.env.STRAPI_LICENSE;
  } else if (fs.existsSync(licensePath)) {
    license = fs.readFileSync(licensePath);
  }

  if (!license) return false;

  try {
    const plainLicense = Buffer.from(license, 'base64').toString();
    const [signatureb64, contentb64] = plainLicense.split('\n');

    const signature = Buffer.from(signatureb64, 'base64');
    const content = Buffer.from(contentb64, 'base64').toString();

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(content);
    verifier.end();

    const isValid = verifier.verify(publicKey, signature);
    if (!isValid) return warnAndReturn();

    const ctx = JSON.parse(content);

    if (ctx.expireAt < new Date().getTime()) {
      return warnAndReturn('License expired');
    }
  } catch (err) {
    return warnAndReturn();
  }

  logger.info('License checked. Starting in EE.');
  return true;
};
