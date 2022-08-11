'use strict';

const crypto = require('crypto');

module.exports = {
  hashAdminUser(payload) {
    if (typeof payload === 'string') {
      return crypto.createHash('sha256').update(payload).digest('hex');
    }

    return crypto.createHash('sha256').update(payload.email).digest('hex');
  },
};
