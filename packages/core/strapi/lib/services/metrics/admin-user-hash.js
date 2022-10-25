'use strict';

const crypto = require('crypto');

const generateAdminUserHash = (ctx) => {
  if (!ctx?.state?.user) {
    return '';
  }
  return crypto.createHash('sha256').update(ctx.state.user.email).digest('hex');
};

module.exports = {
  generateAdminUserHash,
};
