'use strict';

const _ = require('lodash');
const jwt = require('jsonwebtoken');

const defaultOptions = { expiresIn: '30d' };

const getTokenOptions = () => {
  const { options, secret } = strapi.config.get('server.admin.auth', {});

  return {
    secret,
    options: _.merge(defaultOptions, options),
  };
};

/**
 * Creates a JWT token for an administration user
 * @param {object} admon - admin user
 */
const createToken = user => {
  const { options, secret } = getTokenOptions();

  return jwt.sign({ id: user.id }, secret, options);
};

/**
 * Tries to decode a token an return its payload and if it is valid
 * @param {string} token - a token to decode
 * @return {Object} decodeInfo - the decoded info
 */
const decodeToken = token => {
  const { secret } = getTokenOptions();

  try {
    const payload = jwt.verify(token, secret);
    return { payload, isValid: true };
  } catch (err) {
    return { payload: null, isValid: false };
  }
};

module.exports = {
  createToken,
  getTokenOptions,
  decodeToken,
};
