'use strict';

const crypto = require('crypto');
const { omit, difference, isNil, isEmpty, map, isArray, uniq } = require('lodash/fp');
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
 * @property {string} description
 * @property {string} accessKey
 * @property {number} lastUsedAt
 * @property {number} lifespan
 * @property {number} expiresAt
 * @property {TokenType} type
 * @property {(number|ApiTokenPermission)[]} permissions
 */

/**
 * @typedef ApiTokenPermission
 *
 * @property {number|string} id
 * @property {string} action
 * @property {ApiToken|number} token
 */

/** @constant {Array<string>} */
const SELECT_FIELDS = [
  'id',
  'name',
  'description',
  'lastUsedAt',
  'type',
  'lifespan',
  'expiresAt',
  'createdAt',
  'updatedAt',
];

/** @constant {Array<string>} */
const POPULATE_FIELDS = ['permissions'];

// TODO: we need to ensure the permissions are actually valid registered permissions!

/**
 * Assert that a token's permissions attribute is valid for its type
 *
 * @param {ApiToken} token
 */
const assertCustomTokenPermissionsValidity = (attributes) => {
  // Ensure non-custom tokens doesn't have permissions
  if (attributes.type !== constants.API_TOKEN_TYPE.CUSTOM && !isEmpty(attributes.permissions)) {
    throw new ValidationError('Non-custom tokens should not reference permissions');
  }

  // Custom type tokens should always have permissions attached to them
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM && !isArray(attributes.permissions)) {
    throw new ValidationError('Missing permissions attribute for custom token');
  }

  // Permissions provided for a custom type token should be valid/registered permissions UID
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM) {
    const validPermissions = strapi.contentAPI.permissions.providers.action.keys();
    const invalidPermissions = difference(attributes.permissions, validPermissions);

    if (!isEmpty(invalidPermissions)) {
      throw new ValidationError(`Unknown permissions provided: ${invalidPermissions.join(', ')}`);
    }
  }
};

/**
 * Assert that a token's lifespan is valid
 *
 * @param {ApiToken} token
 */
const assertValidLifespan = ({ lifespan }) => {
  if (isNil(lifespan)) {
    return;
  }

  if (!Object.values(constants.API_TOKEN_LIFESPANS).includes(lifespan)) {
    throw new ValidationError(
      `lifespan must be one of the following values: 
      ${Object.values(constants.API_TOKEN_LIFESPANS).join(', ')}`
    );
  }
};

/**
 * Flatten a token's database permissions objects to an array of strings
 *
 * @param {ApiToken} token
 *
 * @returns {ApiToken}
 */
const flattenTokenPermissions = (token) => {
  if (!token) return token;
  return {
    ...token,
    permissions: isArray(token.permissions) ? map('action', token.permissions) : token.permissions,
  };
};

/**
 *  Get a token
 *
 * @param {Object} whereParams
 * @param {string|number} whereParams.id
 * @param {string} whereParams.name
 * @param {number} whereParams.lastUsedAt
 * @param {string} whereParams.description
 * @param {string} whereParams.accessKey
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
  return flattenTokenPermissions(token);
};

/**
 * Check if token exists
 *
 * @param {Object} whereParams
 * @param {string|number} whereParams.id
 * @param {string} whereParams.name
 * @param {number} whereParams.lastUsedAt
 * @param {string} whereParams.description
 * @param {string} whereParams.accessKey
 *
 * @returns {Promise<boolean>}
 */
const exists = async (whereParams = {}) => {
  const apiToken = await getBy(whereParams);

  return !!apiToken;
};

/**
 * Return a secure sha512 hash of an accessKey
 *
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
 * @param {number} lifespan
 *
 * @returns { { lifespan: null | number, expiresAt: null | number } }
 */
const getExpirationFields = (lifespan) => {
  // it must be nil or a finite number >= 0
  const isValidNumber = Number.isFinite(lifespan) && lifespan > 0;
  if (!isValidNumber && !isNil(lifespan)) {
    throw new ValidationError('lifespan must be a positive number or null');
  }

  return {
    lifespan: lifespan || null,
    expiresAt: lifespan ? Date.now() + lifespan : null,
  };
};

/**
 * Create a token and its permissions
 *
 * @param {Object} attributes
 * @param {TokenType} attributes.type
 * @param {string} attributes.name
 * @param {number} attributes.lifespan
 * @param {string[]} attributes.permissions
 * @param {string} attributes.description
 *
 * @returns {Promise<ApiToken>}
 */
const create = async (attributes) => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  assertCustomTokenPermissionsValidity(attributes);
  assertValidLifespan(attributes);

  // Create the token
  const apiToken = await strapi.query('admin::api-token').create({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    data: {
      ...omit('permissions', attributes),
      accessKey: hash(accessKey),
      ...getExpirationFields(attributes.lifespan),
    },
  });

  const result = { ...apiToken, accessKey };

  // If this is a custom type token, create and the related permissions
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM) {
    // TODO: createMany doesn't seem to create relation properly, implement a better way rather than a ton of queries
    // const permissionsCount = await strapi.query('admin::api-token-permission').createMany({
    //   populate: POPULATE_FIELDS,
    //   data: attributes.permissions.map(action => ({ action, token: apiToken })),
    // });
    await Promise.all(
      uniq(attributes.permissions).map((action) =>
        strapi.query('admin::api-token-permission').create({
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

  if (!apiToken) {
    throw new NotFoundError('The provided token id does not exist');
  }

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
 * Return a list of all tokens and their permissions
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const list = async () => {
  const tokens = await strapi.query('admin::api-token').findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
  });

  if (!tokens) return tokens;
  return tokens.map((token) => flattenTokenPermissions(token));
};

/**
 * Revoke (delete) a token
 *
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
 * Retrieve a token by id
 *
 * @param {string|number} id
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const getById = async (id) => {
  return getBy({ id });
};

/**
 * Retrieve a token by name
 *
 * @param {string} name
 *
 * @returns {Promise<Omit<ApiToken, 'accessKey'>>}
 */
const getByName = async (name) => {
  return getBy({ name });
};

/**
 * Update a token and its permissions
 *
 * @param {string|number} id
 * @param {Object} attributes
 * @param {TokenType} attributes.type
 * @param {string} attributes.name
 * @param {number} attributes.lastUsedAt
 * @param {string[]} attributes.permissions
 * @param {string} attributes.description
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
    attributes.type === constants.API_TOKEN_TYPE.CUSTOM &&
    originalToken.type !== constants.API_TOKEN_TYPE.CUSTOM;

  // if we're updating the permissions on any token type, or changing from non-custom to custom, ensure they're still valid
  // if neither type nor permissions are changing, we don't need to validate again or else we can't allow partial update
  if (attributes.permissions || changingTypeToCustom) {
    assertCustomTokenPermissionsValidity({
      ...originalToken,
      ...attributes,
      type: attributes.type || originalToken.type,
    });
  }

  assertValidLifespan(attributes);

  const updatedToken = await strapi.query('admin::api-token').update({
    select: SELECT_FIELDS,
    where: { id },
    data: omit('permissions', attributes),
  });

  // custom tokens need to have their permissions updated as well
  if (updatedToken.type === constants.API_TOKEN_TYPE.CUSTOM && attributes.permissions) {
    const currentPermissionsResult = await strapi.entityService.load(
      'admin::api-token',
      updatedToken,
      'permissions'
    );

    const currentPermissions = map('action', currentPermissionsResult || []);
    const newPermissions = uniq(attributes.permissions);

    const actionsToDelete = difference(currentPermissions, newPermissions);
    const actionsToAdd = difference(newPermissions, currentPermissions);

    // TODO: improve efficiency here
    // method using a loop -- works but very inefficient
    await Promise.all(
      actionsToDelete.map((action) =>
        strapi.query('admin::api-token-permission').delete({
          where: { action, token: id },
        })
      )
    );

    // TODO: improve efficiency here
    // using a loop -- works but very inefficient
    await Promise.all(
      actionsToAdd.map((action) =>
        strapi.query('admin::api-token-permission').create({
          data: { action, token: id },
        })
      )
    );
  }
  // if type is not custom, make sure any old permissions get removed
  else if (updatedToken.type !== constants.API_TOKEN_TYPE.CUSTOM) {
    await strapi.query('admin::api-token-permission').delete({
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
