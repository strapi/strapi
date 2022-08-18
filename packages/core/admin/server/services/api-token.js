'use strict';

const crypto = require('crypto');
const { omit, difference, isEmpty, map, isArray } = require('lodash/fp');
const { ValidationError, NotFoundError } = require('@strapi/utils').errors;
const constants = require('./constants');

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
 * @property {number} lastUsed
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
const SELECT_FIELDS = ['id', 'name', 'description', 'lastUsed', 'type', 'createdAt', 'updatedAt'];

/** @constant {Array<string>} */
const POPULATE_FIELDS = ['permissions'];

const assertCustomTokenPermissionsValidity = (attributes) => {
  // Ensure non-custom tokens doesn't have permissions
  if (attributes.type !== constants.API_TOKEN_TYPE.CUSTOM && !isEmpty(attributes.permissions)) {
    throw new ValidationError('Non-custom tokens should not reference permissions');
  }

  // Custom type tokens should always have permissions attached to them
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM && isEmpty(attributes.permissions)) {
    throw new ValidationError('Missing permissions attribute for custom token');
  }
};

/**
 * @param {Object} whereParams
 * @param {string|number} [whereParams.id]
 * @param {string} [whereParams.name]
 * @param {number} [whereParams.lastUsed]
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
 * @param {string[]} [attributes.permissions]
 * @param {string} [attributes.description]
 *
 * @returns {Promise<ApiToken>}
 */
const create = async (attributes) => {
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

  // If this is a custom type token, create and the related permissions
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM) {
    // TODO: createMany doesn't seem to create relation properly, implement a better way rather than a ton of queries
    // const permissionsCount = await strapi.query('admin::token-permission').createMany({
    //   populate: POPULATE_FIELDS,
    //   data: attributes.permissions.map(action => ({ action, token: apiToken })),
    // });
    await Promise.all(
      attributes.permissions.map((action) =>
        strapi.query('admin::token-permission').create({
          data: { action, token: apiToken },
        })
      )
    );

    const currentPermissions = await strapi.entityService.load(
      'admin::api-token',
      apiToken,
      'permissions'
    );

    if (currentPermissions) {
      Object.assign(result, { permissions: map('action', currentPermissions) });
    }
  }

  return result;
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<ApiToken>}
 */
const regenerate = async (id) => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  const apiToken = await strapi.query('admin::api-token').update({
    select: ['id', 'accessKey'],
    where: { id },
    data: {
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
  const tokens = await strapi.query('admin::api-token').findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
  });

  if (!tokens) return tokens;
  return tokens.map((token) => mapTokenPermissions(token));
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const revoke = async (id) => {
  return strapi
    .query('admin::api-token')
    .delete({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: { id } });
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
 * @param {number} attributes.lastUsed
 * @param {string[]} [attributes.permissions]
 * @param {string} [attributes.description]
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const update = async (id, attributes) => {
  // retrieve token without permissions
  const originalToken = await strapi.query('admin::api-token').findOne({ where: { id } });

  if (!originalToken) {
    throw new NotFoundError('Token not found');
  }

  const changingTypeToCustom =
    attributes.type === constants.API_TOKEN_TYPE.custom &&
    originalToken.type !== constants.API_TOKEN_TYPE.custom;

  // if we're updating the permissions on any token type, or changing from non-custom to custom, ensure they're still valid
  // if neither type nor permissions are changing, we don't need to validate again or else we can't allow partial update
  if (attributes.permissions || changingTypeToCustom) {
    assertCustomTokenPermissionsValidity({
      ...originalToken,
      ...attributes,
      type: attributes.type || originalToken.type,
    });
  }

  const updatedToken = await strapi.query('admin::api-token').update({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    where: { id },
    data: omit('permissions', attributes),
  });

  // custom tokens need to have their permissions updated as well
  if (updatedToken.type === constants.API_TOKEN_TYPE.CUSTOM && attributes.permissions) {
    const currentPermissionsResult =
      (await strapi.entityService.load('admin::api-token', updatedToken, 'permissions')) || [];

    const actionsToDelete = difference(
      map('action', currentPermissionsResult),
      attributes.permissions
    );
    const actionsToAdd = difference(attributes.permissions, originalToken.permissions);

    // TODO: improve efficiency here
    // method using a loop -- works but very inefficient
    await Promise.all(
      actionsToDelete.map((action) =>
        strapi.query('admin::token-permission').delete({
          where: { action, token: id },
        })
      )
    );

    // method using deleteMany -- leaves relations in _links table!
    // await strapi
    //   .query('admin::token-permission')
    //   .deleteMany({ where: { action: map('action', permissionsToDelete), token: id } });

    // TODO: improve efficiency here
    // using a loop -- works but very inefficient
    await Promise.all(
      actionsToAdd.map((action) =>
        strapi.query('admin::token-permission').create({
          data: { action, token: id },
        })
      )
    );

    // method using createMany -- doesn't create relations in _links table!
    // await strapi
    //   .query('admin::token-permission')
    //   .createMany({ data: actionsToAdd.map(action => ({ action, token: id })) });

    // method attempting to use entityService -- can't create new items in entityservice, permissions need to already exist
    // await strapi.entityService.update('admin::api-token', originalToken.id, {
    //   data: {
    //     permissions: [
    //       actionsToAdd.map(action => {
    //         return { action };
    //       }),
    //     ],
    //   },
    //   populate: POPULATE_FIELDS,
    // });

    // method attempting to createMany permissions, then update token with those permissions -- createMany doesn't return the ids, and we can't query for them
  }
  // if type is not custom, make sure any old permissions get removed
  else if (updatedToken.type !== constants.API_TOKEN_TYPE.CUSTOM) {
    await strapi.query('admin::token-permission').delete({
      where: { token: id },
    });
  }

  // retrieve permissions
  const permissionsFromDb = await strapi.entityService.load(
    'admin::api-token',
    updatedToken,
    'permissions'
  );

  return {
    ...updatedToken,
    permissions: permissionsFromDb ? permissionsFromDb.map((p) => p.action) : undefined,
  };
};

/**
 * @param {Object} whereParams
 * @param {string|number} [whereParams.id]
 * @param {string} [whereParams.name]
 * @param {number} [whereParams.lastUsed]
 * @param {string} [whereParams.description]
 * @param {string} [whereParams.accessKey]
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'> | null>}
 */
const getBy = async (whereParams = {}) => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  const token = await strapi
    .query('admin::api-token')
    .findOne({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: whereParams });

  if (!token) return token;
  return mapTokenPermissions(token);
};

const mapTokenPermissions = (token) => {
  if (!token) return token;
  return {
    ...token,
    permissions: isArray(token.permissions) ? map('action', token.permissions) : token.permissions,
  };
};

module.exports = {
  create,
  regenerate,
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
