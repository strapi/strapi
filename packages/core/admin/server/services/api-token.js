'use strict';

const crypto = require('crypto');

/**
 * @typedef ApiToken
 *
 * @property {number} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} accessKey
 * @property {'read-only'|'full-access'} type
 */

/**
 * @param {Object} whereParams
 * @param {string} whereParams.name
 * @param {string} [whereParams.description]
 *
 * @returns {Promise<boolean>}
 */
const exists = async (whereParams = {}) => {
  const apiToken = await strapi.query('admin::api-token').findOne({ where: whereParams });

  return !!apiToken;
};

/**
 * @param {string} accessKey
 *
 * @returns {string}
 */
const hash = accessKey => {
  return crypto
    .createHash('sha512')
    .update(`${strapi.config.get('server.admin.api-token.salt')}${accessKey}`)
    .digest('hex');
};

/**
 * @param {Object} attributes
 * @param {'read-only'|'full-access'} attributes.type
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 *
 * @returns {Promise<ApiToken>}
 */
const create = async attributes => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  const apiToken = await strapi.query('admin::api-token').create({
    select: ['id', 'name', 'description', 'type'],
    data: {
      ...attributes,
      accessKey: hash(accessKey),
    },
  });

  return {
    ...apiToken,
    accessKey,
  };
};

/**
 * @returns {void}
 */
const createSaltIfNotDefined = () => {
  if (strapi.config.get('server.admin.api-token.salt')) {
    return;
  }

  if (process.env.API_TOKEN_SALT) {
    throw new Error(
      `There's something wrong with the configuration of your api-token salt. If you have changed the env variable used in the configuration file, please verify that you have created and set the variable in your .env file.`
    );
  }

  const salt = crypto.randomBytes(16).toString('hex');
  strapi.fs.appendFile('.env', `API_TOKEN_SALT=${salt}\n`);
  strapi.config.set('server.admin.api-token.salt', salt);
};

module.exports = {
  create,
  exists,
  createSaltIfNotDefined,
  hash,
};
