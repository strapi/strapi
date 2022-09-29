'use strict';

const hash = require('hash.js');

const generateAdminUserHash = (ctx) => {
  if (!ctx?.state?.user) return '';
  try {
    return hash.sha256().update(ctx.state.user.email).digest('hex');
  } catch (error) {
    return '';
  }
};

module.exports = {
  generateAdminUserHash,
};
