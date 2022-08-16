const crypto = require('crypto');

const hashAdminUser = (payload) => {
  return crypto.createHash('sha256').update(payload).digest('hex');
};

module.exports = hashAdminUser;
