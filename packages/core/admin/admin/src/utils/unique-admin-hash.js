const hash = require('hash.js');

const hashAdminUserEmail = (payload) => {
  try {
    const adminUserEmailHash = hash.sha256().update(payload.email).digest('hex');

    return adminUserEmailHash;
  } catch (error) {
    return '';
  }
};

module.exports = hashAdminUserEmail;
