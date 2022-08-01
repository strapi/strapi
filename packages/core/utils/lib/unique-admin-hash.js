'use strict';

const crypto = require('crypto');

const hashAdminUser = ctx => {
  return crypto
    .createHash('sha256')
    .update(ctx.state.user.email)
    .digest('hex');
};

module.exports = hashAdminUser;
