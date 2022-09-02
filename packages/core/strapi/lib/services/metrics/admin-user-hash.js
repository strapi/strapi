'use strict';

const hash = require('hash.js');

const generateAdminUserHash = (payload) => {
  if (!payload.adminUser) return '';
  try {
    return hash.sha256().update(payload.adminUser.email).digest('hex');
  } catch (error) {
    return '';
  }
};

module.exports = {
  generateAdminUserHash,
};
