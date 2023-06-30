'use strict';

const crypto = require('crypto');

/**
 * Generate an admin user hash
 *
 * @param {Strapi.Strapi} strapi
 * @returns {string}
 */
const generateAdminUserHash = (strapi) => {
  const ctx = strapi?.requestContext?.get();
  if (!ctx?.state?.user?.email) {
    return '';
  }
  return crypto.createHash('sha256').update(ctx.state.user.email).digest('hex');
};

module.exports = {
  generateAdminUserHash,
};
