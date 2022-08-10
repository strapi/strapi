'use strict';

const crypto = require('crypto');
const { map, omit, differenceBy, isEmpty } = require('lodash/fp');
const { ValidationError, NotFoundError } = require('@strapi/utils').errors;
const constants = require('../services/constants');

/**
 * @typedef {'read-only'|'full-access'|'custom'} TokenType
 */

/**
 * @typedef ApiToken
 *
 * @property {number|string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} accessKey
 * @property {TokenType} type
 * @property {(number|ApiTokenPermission)[]} [permissions]
 */

/**
 * @typedef ApiTokenPermission
 *
 * @property {number|string} id
 * @property {string} action
 * @property {ApiToken|number} [token]
 */

/** @constant {Array<string>} */
const SELECT_FIELDS = ['id', 'name', 'description', 'type', 'createdAt'];

/** @constant {Array<string>} */
const POPULATE_FIELDS = ['permissions'];

const assertCustomTokenPermissionsValidity = attributes => {
  // Ensure non-custom tokens doesn't have permissions
  if (attributes.type !== constants.API_TOKEN_TYPE.CUSTOM && !isEmpty(attributes.permissions)) {
    throw new ValidationError('Non-custom tokens should not references permissions');
  }

  // Custom type tokens should always have permissions attached to them
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM && isEmpty(attributes.permissions)) {
    throw new ValidationError('Missing permissions attributes for custom token');
  }
};

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
const hash = accessKey => {
  return crypto
    .createHmac('sha512', strapi.config.get('admin.apiToken.salt'))
    .update(accessKey)
    .digest('hex');
};

/**
 * @param {Object} attributes
 * @param {TokenType} attributes.type
 * @param {string} attributes.name
 * @param {string[]} [attributes.permissions]
 * @param {string} [attributes.description]
 *
 * @returns {Promise<ApiToken>}
 */
const create = async attributes => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  assertCustomTokenPermissionsValidity(attributes);

  // Create the token
  const apiToken = await strapi.query('admin::api-token').create({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    data: {
      ...omit('permissions', attributes),
      accessKey: hash(accessKey),
    },
  });

  const result = { ...apiToken, accessKey };

  // If this is a custom type token, create and link the associated permissions
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM) {
    const permissionsCount = await strapi
      .query('admin::token-permission')
      .createMany({ data: attributes.permissions.map(action => ({ action, token: apiToken.id })) });

    // TODO: select the permissions to ensure it worked
    if (permissionsCount) {
      Object.assign(result, { permissions: attributes.permissions });
    }
  }

  return result;
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
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
  });
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const revoke = async id => {
  return strapi
    .query('admin::api-token')
    .delete({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: { id } });
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const getById = async id => {
  return getBy({ id });
};

/**
 * @param {string} name
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const getByName = async name => {
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
  // retrieve token without permissions
  const oldToken = await strapi.query('admin::api-token').findOne({ where: { id } });

  if (!oldToken) {
    throw new NotFoundError('Token not found');
  }

  assertCustomTokenPermissionsValidity({
    ...oldToken,
    ...attributes,
    type: attributes.type || oldToken.type,
  });

  const token = await strapi.query('admin::api-token').update({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    where: { id },
    data: omit('permissions', attributes),
  });

  let permissions = {};
  if (token.type === constants.API_TOKEN_TYPE.CUSTOM) {
    const permissionsToDelete = differenceBy('action', token.permissions, attributes.permissions);
    const permissionsToCreate = differenceBy('action', attributes.permissions, token.permissions);

    // TODO: this is deleting the permission, but not the link to this token
    await strapi
      .query('admin::token-permission')
      .deleteMany({ where: { action: map('action', permissionsToDelete) } });

    // TODO: This is only creating the permission, not linking it to this token
    await strapi
      .query('admin::token-permission')
      .createMany({ data: permissionsToCreate.map(action => ({ action, token: id })) });

    permissions = {
      permissions: await strapi.entityService.load('admin::api-token', token, 'permissions'),
    };
  } else {
    // TODO: if type is changing from custom, make sure old permissions get removed
  }

  return { ...token, ...permissions };
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

  return strapi
    .query('admin::api-token')
    .findOne({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: whereParams });
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
