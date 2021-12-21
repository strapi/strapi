'use strict';

const crypto = require('crypto');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

const defaultSignOptions = { expiresIn: '30d' };
const defaultVerifyOptions = {};

const getTokenOptions = () => {
  const { secret, signOptions, verifyOptions } = strapi.config.get('admin.auth', {});

  return {
    secret,
    signOptions: _.merge(_.cloneDeep(defaultSignOptions), signOptions),
    verifyOptions: _.merge(_.cloneDeep(defaultVerifyOptions), verifyOptions),
  };
};

/**
 * Create a random token
 * @returns {string}
 */
const createToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

/**
 * Creates a JWT token for an administration user
 * @param {object} user - admin user
 */
const createJwtToken = user => {
  const { signOptions, secret } = getTokenOptions();

  return jwt.sign({ id: user.id }, secret, signOptions);
};

/**
 * Tries to decode a token an return its payload and if it is valid
 * @param {string} token - a token to decode
 * @return {Object} decodeInfo - the decoded info
 */
const decodeJwtToken = token => {
  const { secret, verifyOptions } = getTokenOptions();

  try {
    const payload = jwt.verify(token, secret, verifyOptions);
    return { payload, isValid: true };
  } catch (err) {
    return { payload: null, isValid: false };
  }
};

module.exports = {
  createToken,
  createJwtToken,
  getTokenOptions,
  decodeJwtToken,
};
