'use strict';

const crypto = require('crypto');
const sanitize = require('./sanitize');

const MAX_USERNAME_ATTEMPTS = 10;

const getService = (name) => {
  return strapi.plugin('users-permissions').service(name);
};

const isUsernameTaken = async (username) => {
  const user = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { username } });
  return Boolean(user);
};

const findValidUsername = async (basename) => {
  const minLength =
    strapi.getModel('plugin::users-permissions.user')?.attributes?.username?.minLength ?? 3;
  const tryBasenameFirst = basename.length >= minLength;

  let attempt = 0;
  let candidate;
  let taken;
  do {
    candidate =
      attempt === 0 && tryBasenameFirst ? basename : `${basename}${crypto.randomInt(1000, 9999)}`;
    taken = await isUsernameTaken(candidate);
    attempt += 1;
  } while (taken && attempt <= MAX_USERNAME_ATTEMPTS);

  return taken ? crypto.randomUUID() : candidate;
};

module.exports = {
  getService,
  isUsernameTaken,
  findValidUsername,
  sanitize,
};
