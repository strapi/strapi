'use strict';

const crypto = require('crypto');

/**
 * @typedef {'read-only'|'full-access'} TokenType
 */

/**
 * @typedef ApiToken
 *
 * @property {number|string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} accessKey
 * @property {TokenType} type
 */

/** @constant {Array<string>} */
const SELECT_FIELDS = ['id', 'name', 'description', 'type'];

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
    .createHmac('sha512', strapi.config.get('server.admin.api-token.salt'))
    .update(accessKey)
    .digest('hex');
};

/**
 * @param {Object} attributes
 * @param {TokenType} attributes.type
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 *
 * @returns {Promise<ApiToken>}
 */
const create = async attributes => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  const apiToken = await strapi.query('admin::api-token').create({
    select: SELECT_FIELDS,
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

/**
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const list = async () => {
  return strapi.query('admin::api-token').findMany({
    select: SELECT_FIELDS,
    orderBy: { name: 'ASC' },
  });
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const revoke = async id => {
  return strapi.query('admin::api-token').delete({ select: SELECT_FIELDS, where: { id } });
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const get = async id => {
  return strapi.query('admin::api-token').findOne({ select: SELECT_FIELDS, where: { id } });
};

module.exports = {
  create,
  exists,
  createSaltIfNotDefined,
  hash,
  list,
  revoke,
  get,
};
