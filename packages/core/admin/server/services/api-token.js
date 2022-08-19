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
const SELECT_FIELDS = ['id', 'name', 'description', 'type', 'createdAt', 'updatedAt'];

/**
 * @param {Object} whereParams
 * @param {string|number} [whereParams.id]
 * @param {string} [whereParams.name]
 * @param {string} [whereParams.description]
 * @param {string} [whereParams.accessKey]
 *
 * @returns {Promise<boolean>}
 */
const exists = async (whereParams = {}) => {
  const apiToken = await getBy(whereParams);

  return !!apiToken;
};

/**
 * @param {string} accessKey
 *
 * @returns {string}
 */
const hash = (accessKey) => {
  return crypto
    .createHmac('sha512', strapi.config.get('admin.apiToken.salt'))
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
const create = async (attributes) => {
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
const checkSaltIsDefined = () => {
  if (!strapi.config.get('admin.apiToken.salt')) {
    // TODO V5: stop reading API_TOKEN_SALT
    if (process.env.API_TOKEN_SALT) {
      process.emitWarning(`[deprecated] In future versions, Strapi will stop reading directly from the environment variable API_TOKEN_SALT. Please set apiToken.salt in config/admin.js instead.
For security reasons, keep storing the secret in an environment variable and use env() to read it in config/admin.js (ex: \`apiToken: { salt: env('API_TOKEN_SALT') }\`). See https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#configuration-using-environment-variables.`);

      strapi.config.set('admin.apiToken.salt', process.env.API_TOKEN_SALT);
    } else {
      throw new Error(
        `Missing apiToken.salt. Please set apiToken.salt in config/admin.js (ex: you can generate one using Node with \`crypto.randomBytes(16).toString('base64')\`).
For security reasons, prefer storing the secret in an environment variable and read it in config/admin.js. See https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#configuration-using-environment-variables.`
      );
    }
  }
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
const revoke = async (id) => {
  return strapi.query('admin::api-token').delete({ select: SELECT_FIELDS, where: { id } });
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const getById = async (id) => {
  return getBy({ id });
};

/**
 * @param {string} name
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const getByName = async (name) => {
  return getBy({ name });
};

/**
 * @param {string|number} id
 * @param {Object} attributes
 * @param {TokenType} attributes.type
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const update = async (id, attributes) => {
  return strapi
    .query('admin::api-token')
    .update({ where: { id }, data: attributes, select: SELECT_FIELDS });
};

/**
 * @param {Object} whereParams
 * @param {string|number} [whereParams.id]
 * @param {string} [whereParams.name]
 * @param {string} [whereParams.description]
 * @param {string} [whereParams.accessKey]
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'> | null>}
 */
const getBy = async (whereParams = {}) => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  return strapi.query('admin::api-token').findOne({ select: SELECT_FIELDS, where: whereParams });
};

module.exports = {
  create,
  exists,
  checkSaltIsDefined,
  hash,
  list,
  revoke,
  getById,
  update,
  getByName,
  getBy,
};
