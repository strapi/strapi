'use strict';

const crypto = require('crypto');
const sanitize = require('./sanitize');

const MAX_USERNAME_ATTEMPTS = 10;

const getService = (name) => {
  return strapi.plugin('users-permissions').service(name);
};

const findUniqueUsername = async (basename) => {
  // First, check if the basename itself is available
  const existingUser = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { username: basename } });

  if (!existingUser) {
    return basename;
  }

  // Try appending random numbers
  for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
    const randomSuffix = crypto.randomInt(1000, 9999);
    const candidateUsername = `${basename}${randomSuffix}`;

    const userExists = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username: candidateUsername } });

    if (!userExists) {
      return candidateUsername;
    }
  }

  // Fallback to UUID if all attempts fail
  return crypto.randomUUID();
};

module.exports = {
  getService,
  findUniqueUsername,
  sanitize,
};
