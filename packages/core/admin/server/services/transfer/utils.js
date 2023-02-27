'use strict';

const { env } = require('@strapi/utils');

const { getService } = require('../../utils');

/**
 * Returns whether the data transfer features have been disabled from the env configuration
 *
 * @returns {boolean}
 */
const isDisabledFromEnv = () => {
  return env.bool('STRAPI_DISABLE_REMOTE_DATA_TRANSFER', false);
};

/**
 * A valid transfer token salt must be a non-empty string defined in the Strapi config
 *
 * @returns {boolean}
 */
const hasValidTokenSalt = () => {
  const salt = strapi.config.get('admin.transfer.token.salt', null);

  return typeof salt === 'string' && salt.length > 0;
};

/**
 * Checks whether data transfer features are enabled
 *
 * @returns {boolean}
 */
const isDataTransferEnabled = () => {
  const { utils } = getService('transfer');

  return !utils.isDisabledFromEnv() && utils.hasValidTokenSalt();
};

module.exports = { isDataTransferEnabled, isDisabledFromEnv, hasValidTokenSalt };
