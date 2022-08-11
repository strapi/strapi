const crypto = require('crypto');

const hashAdminUser = (payload) => {
  if (typeof payload === 'string') {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  return crypto.createHash('sha256').update(payload.state.user.email).digest('hex');
};

module.exports = hashAdminUser;
