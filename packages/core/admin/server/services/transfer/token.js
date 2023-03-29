'use strict';

const { map, isArray, omit, uniq, isNil, difference, isEmpty } = require('lodash/fp');
const crypto = require('crypto');

const {
  errors: { ValidationError, NotFoundError },
} = require('@strapi/utils');

const constants = require('../constants');
const { getService } = require('../../utils');

const TRANSFER_TOKEN_UID = 'admin::transfer-token';
const TRANSFER_TOKEN_PERMISSION_UID = 'admin::transfer-token-permission';

/**
 * @typedef TransferToken
 *
 * @property {number|string} id
 * @property {string} name
 * @property {string} description
 * @property {string} accessKey
 * @property {number} lastUsedAt
 * @property {number} lifespan
 * @property {number} expiresAt
 * @property {(number[]|TransferTokenPermission[])} permissions
 */

/**
 * @typedef TransferTokenPermission
 *
 * @property {number|string} id
 * @property {string} action
 * @property {TransferToken|number} token
 */

/** @constant {Array<string>} */
const SELECT_FIELDS = [
  'id',
  'name',
  'description',
  'lastUsedAt',
  'lifespan',
  'expiresAt',
  'createdAt',
  'updatedAt',
];

/** @constant {Array<string>} */
const POPULATE_FIELDS = ['permissions'];

/**
 * Return a list of all tokens and their permissions
 *
 * @returns {Promise<Omit<TransferToken, 'accessKey'>[]>}
 */
const list = async () => {
  const tokens = await strapi.query(TRANSFER_TOKEN_UID).findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
  });

  if (!tokens) return tokens;
  return tokens.map((token) => flattenTokenPermissions(token));
};

/**
 * Create a token and its permissions
 *
 * @param {Object} attributes
 * @param {string} attributes.name
 * @param {string} attributes.description
 * @param {number} attributes.lifespan
 * @param {string[]} attributes.permissions
 *
 * @returns {Promise<TransferToken>}
 */
const create = async (attributes) => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  assertTokenPermissionsValidity(attributes);
  assertValidLifespan(attributes);

  const result = await strapi.db.transaction(async () => {
    const transferToken = await strapi.query(TRANSFER_TOKEN_UID).create({
      select: SELECT_FIELDS,
      populate: POPULATE_FIELDS,
      data: {
        ...omit('permissions', attributes),
        accessKey: hash(accessKey),
        ...getExpirationFields(attributes.lifespan),
      },
    });

    await Promise.all(
      uniq(attributes.permissions).map((action) =>
        strapi
          .query(TRANSFER_TOKEN_PERMISSION_UID)
          .create({ data: { action, token: transferToken } })
      )
    );

    const currentPermissions = await strapi.entityService.load(
      TRANSFER_TOKEN_UID,
      transferToken,
      'permissions'
    );

    if (currentPermissions) {
      Object.assign(transferToken, { permissions: map('action', currentPermissions) });
    }

    return transferToken;
  });

  return { ...result, accessKey };
};

/**
 * Update a token and its permissions
 *
 * @param {string|number} id
 * @param {Object} attributes
 * @param {string} attributes.name
 * @param {number} attributes.lastUsedAt
 * @param {string[]} attributes.permissions
 * @param {string} attributes.description
 *
 * @returns {Promise<Omit<TransferToken, 'accessKey'>>}
 */
const update = async (id, attributes) => {
  // retrieve token without permissions
  const originalToken = await strapi.query(TRANSFER_TOKEN_UID).findOne({ where: { id } });

  if (!originalToken) {
    throw new NotFoundError('Token not found');
  }

  assertTokenPermissionsValidity(attributes);
  assertValidLifespan(attributes);

  return strapi.db.transaction(async () => {
    const updatedToken = await strapi.query(TRANSFER_TOKEN_UID).update({
      select: SELECT_FIELDS,
      where: { id },
      data: {
        ...omit('permissions', attributes),
      },
    });

    if (attributes.permissions) {
      const currentPermissionsResult = await strapi.entityService.load(
        TRANSFER_TOKEN_UID,
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
          strapi.query(TRANSFER_TOKEN_PERMISSION_UID).delete({
            where: { action, token: id },
          })
        )
      );

      // TODO: improve efficiency here
      // using a loop -- works but very inefficient
      await Promise.all(
        actionsToAdd.map((action) =>
          strapi.query(TRANSFER_TOKEN_PERMISSION_UID).create({
            data: { action, token: id },
          })
        )
      );
    }

    // retrieve permissions
    const permissionsFromDb = await strapi.entityService.load(
      TRANSFER_TOKEN_UID,
      updatedToken,
      'permissions'
    );

    return {
      ...updatedToken,
      permissions: permissionsFromDb ? permissionsFromDb.map((p) => p.action) : undefined,
    };
  });
};

/**
 * Revoke (delete) a token
 *
 * @param {string|number} id
 *
 * @returns {Promise<Omit<TransferToken, 'accessKey'>>}
 */
const revoke = async (id) => {
  return strapi.db.transaction(async () =>
    strapi
      .query(TRANSFER_TOKEN_UID)
      .delete({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: { id } })
  );
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
 * @returns {Promise<Omit<TransferToken, 'accessKey'> | null>}
 */
const getBy = async (whereParams = {}) => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  const token = await strapi
    .query(TRANSFER_TOKEN_UID)
    .findOne({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: whereParams });

  if (!token) return token;
  return flattenTokenPermissions(token);
};

/**
 * Retrieve a token by id
 *
 * @param {string|number} id
 *
 * @returns {Promise<Omit<TransferToken, 'accessKey'>>}
 */
const getById = async (id) => {
  return getBy({ id });
};

/**
 * Retrieve a token by name
 *
 * @param {string} name
 *
 * ^@returns {Promise<Omit<TransferToken, 'accessKey'>>}
 */
const getByName = async (name) => {
  return getBy({ name });
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
  const transferToken = await getBy(whereParams);

  return !!transferToken;
};

/**
 * @param {string|number} id
 *
 * @returns {Promise<TransferToken>}
 */
const regenerate = async (id) => {
  const accessKey = crypto.randomBytes(128).toString('hex');
  const transferToken = await strapi.db.transaction(async () =>
    strapi.query(TRANSFER_TOKEN_UID).update({
      select: ['id', 'accessKey'],
      where: { id },
      data: {
        accessKey: hash(accessKey),
      },
    })
  );

  if (!transferToken) {
    throw new NotFoundError('The provided token id does not exist');
  }

  return {
    ...transferToken,
    accessKey,
  };
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
 * Return a secure sha512 hash of an accessKey
 *
 * @param {string} accessKey
 *
 * @returns {string}
 */
const hash = (accessKey) => {
  const { hasValidTokenSalt } = getService('transfer').utils;

  if (!hasValidTokenSalt()) {
    throw new TypeError('Required token salt is not defined');
  }

  return crypto
    .createHmac('sha512', strapi.config.get('admin.transfer.token.salt'))
    .update(accessKey)
    .digest('hex');
};

/**
 * @returns {void}
 */
const checkSaltIsDefined = () => {
  const { hasValidTokenSalt, isDisabledFromEnv } = getService('transfer').utils;

  // Ignore the check if the data-transfer feature is manually disabled
  if (isDisabledFromEnv()) {
    return;
  }

  if (!hasValidTokenSalt()) {
    process.emitWarning(
      `Missing transfer.token.salt: Data transfer features have been disabled.
Please set transfer.token.salt in config/admin.js (ex: you can generate one using Node with \`crypto.randomBytes(16).toString('base64')\`)
For security reasons, prefer storing the secret in an environment variable and read it in config/admin.js. See https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#configuration-using-environment-variables.`
    );
  }
};

/**
 * Flatten a token's database permissions objects to an array of strings
 *
 * @param {TransferToken} token
 *
 * @returns {TransferToken}
 */
const flattenTokenPermissions = (token) => {
  if (!token) return token;

  return {
    ...token,
    permissions: isArray(token.permissions) ? map('action', token.permissions) : token.permissions,
  };
};

/**
 * Assert that a token's permissions are valid
 *
 * @param {TransferToken} token
 */
const assertTokenPermissionsValidity = (attributes) => {
  const permissionService = strapi.admin.services.transfer.permission;
  const validPermissions = permissionService.providers.action.keys();
  const invalidPermissions = difference(attributes.permissions, validPermissions);

  if (!isEmpty(invalidPermissions)) {
    throw new ValidationError(`Unknown permissions provided: ${invalidPermissions.join(', ')}`);
  }
};

/**
 * Assert that a token's lifespan is valid
 *
 * @param {TransferToken} token
 */
const assertValidLifespan = ({ lifespan }) => {
  if (isNil(lifespan)) {
    return;
  }

  if (!Object.values(constants.TRANSFER_TOKEN_LIFESPANS).includes(lifespan)) {
    throw new ValidationError(
      `lifespan must be one of the following values: 
      ${Object.values(constants.TRANSFER_TOKEN_LIFESPANS).join(', ')}`
    );
  }
};

module.exports = {
  create,
  list,
  exists,
  getBy,
  getById,
  getByName,
  update,
  revoke,
  regenerate,
  hash,
  checkSaltIsDefined,
};
