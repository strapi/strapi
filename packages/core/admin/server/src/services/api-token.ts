import crypto from 'crypto';
import { omit, difference, isNil, isEmpty, map, isArray, uniq, isNumber } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Update, ApiToken, ApiTokenBody } from '../../../shared/contracts/api-token';
import constants from './constants';

const { ValidationError, NotFoundError } = errors;

type ApiTokenPermission = {
  id: number | `${number}`;
  action: string;
  token: DBApiToken | number;
};

type DBApiToken = ApiToken & {
  permissions: (number | ApiTokenPermission)[];
};

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

const POPULATE_FIELDS = ['permissions'];

// TODO: we need to ensure the permissions are actually valid registered permissions!

/**
 * Assert that a token's permissions attribute is valid for its type
 */
const assertCustomTokenPermissionsValidity = (
  type: ApiTokenBody['type'],
  permissions: ApiTokenBody['permissions']
) => {
  // Ensure non-custom tokens doesn't have permissions
  if (type !== constants.API_TOKEN_TYPE.CUSTOM && !isEmpty(permissions)) {
    throw new ValidationError('Non-custom tokens should not reference permissions');
  }

  // Custom type tokens should always have permissions attached to them
  if (type === constants.API_TOKEN_TYPE.CUSTOM && !isArray(permissions)) {
    throw new ValidationError('Missing permissions attribute for custom token');
  }

  // Permissions provided for a custom type token should be valid/registered permissions UID
  if (type === constants.API_TOKEN_TYPE.CUSTOM) {
    const validPermissions = strapi.contentAPI.permissions.providers.action.keys();
    const invalidPermissions = difference(permissions, validPermissions) as string[];

    if (!isEmpty(invalidPermissions)) {
      throw new ValidationError(`Unknown permissions provided: ${invalidPermissions.join(', ')}`);
    }
  }
};

/**
 * Check if a token's lifespan is valid
 */
const isValidLifespan = (lifespan: unknown) => {
  if (isNil(lifespan)) {
    return true;
  }

  if (!isNumber(lifespan) || !Object.values(constants.API_TOKEN_LIFESPANS).includes(lifespan)) {
    return false;
  }

  return true;
};

/**
 * Assert that a token's lifespan is valid
 */
const assertValidLifespan = (lifespan: unknown) => {
  if (!isValidLifespan(lifespan)) {
    throw new ValidationError(
      `lifespan must be one of the following values:
      ${Object.values(constants.API_TOKEN_LIFESPANS).join(', ')}`
    );
  }
};

/**
 * Flatten a token's database permissions objects to an array of strings
 */
const flattenTokenPermissions = (token: DBApiToken): ApiToken => {
  if (!token) {
    return token;
  }

  return {
    ...token,
    permissions: isArray(token.permissions) ? map('action', token.permissions) : token.permissions,
  };
};

type WhereParams = {
  id?: string | number;
  name?: string;
  lastUsedAt?: number;
  description?: string;
  accessKey?: string;
};

/**
 *  Get a token
 */
const getBy = async (whereParams: WhereParams = {}): Promise<ApiToken | null> => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  const token = await strapi.db
    .query('admin::api-token')
    .findOne({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: whereParams });

  if (!token) {
    return token;
  }

  return flattenTokenPermissions(token);
};

/**
 * Check if token exists
 */
const exists = async (whereParams: WhereParams = {}): Promise<boolean> => {
  const apiToken = await getBy(whereParams);

  return !!apiToken;
};

/**
 * Return a secure sha512 hash of an accessKey
 */
const hash = (accessKey: string) => {
  return crypto
    .createHmac('sha512', strapi.config.get('admin.apiToken.salt'))
    .update(accessKey)
    .digest('hex');
};

const getExpirationFields = (lifespan: ApiTokenBody['lifespan']) => {
  // it must be nil or a finite number >= 0
  const isValidNumber = isNumber(lifespan) && Number.isFinite(lifespan) && lifespan > 0;
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
 */
const create = async (attributes: ApiTokenBody): Promise<ApiToken> => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  assertCustomTokenPermissionsValidity(attributes.type, attributes.permissions);
  assertValidLifespan(attributes.lifespan);

  // Create the token
  const apiToken: ApiToken = await strapi.db.query('admin::api-token').create({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    data: {
      ...omit('permissions', attributes),
      accessKey: hash(accessKey),
      ...getExpirationFields(attributes.lifespan),
    },
  });

  const result: ApiToken = { ...apiToken, accessKey };

  // If this is a custom type token, create and the related permissions
  if (attributes.type === constants.API_TOKEN_TYPE.CUSTOM) {
    // TODO: createMany doesn't seem to create relation properly, implement a better way rather than a ton of queries
    // const permissionsCount = await strapi.db.query('admin::api-token-permission').createMany({
    //   populate: POPULATE_FIELDS,
    //   data: attributes.permissions.map(action => ({ action, token: apiToken })),
    // });
    await Promise.all(
      uniq(attributes.permissions).map((action) =>
        strapi.db.query('admin::api-token-permission').create({
          data: { action, token: apiToken },
        })
      )
    );

    const currentPermissions = await strapi.db
      .query('admin::api-token')
      .load(apiToken, 'permissions');

    if (currentPermissions) {
      Object.assign(result, { permissions: map('action', currentPermissions) });
    }
  }

  return result;
};

const regenerate = async (id: string | number): Promise<ApiToken> => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  const apiToken: ApiToken = await strapi.db.query('admin::api-token').update({
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
 */
const list = async (): Promise<Array<ApiToken>> => {
  const tokens: Array<DBApiToken> = await strapi.db.query('admin::api-token').findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
  });

  if (!tokens) {
    return tokens;
  }

  return tokens.map((token) => flattenTokenPermissions(token));
};

/**
 * Revoke (delete) a token
 */
const revoke = async (id: string | number): Promise<ApiToken> => {
  return strapi.db
    .query('admin::api-token')
    .delete({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: { id } });
};

/**
 * Retrieve a token by id
 */
const getById = async (id: string | number) => {
  return getBy({ id });
};

/**
 * Retrieve a token by name
 */
const getByName = async (name: string) => {
  return getBy({ name });
};

/**
 * Update a token and its permissions
 */
const update = async (
  id: string | number,
  attributes: Update.Request['body']
): Promise<ApiToken> => {
  // retrieve token without permissions
  const originalToken: DBApiToken = await strapi.db
    .query('admin::api-token')
    .findOne({ where: { id } });

  if (!originalToken) {
    throw new NotFoundError('Token not found');
  }

  const changingTypeToCustom =
    attributes.type === constants.API_TOKEN_TYPE.CUSTOM &&
    originalToken.type !== constants.API_TOKEN_TYPE.CUSTOM;

  // if we're updating the permissions on any token type, or changing from non-custom to custom, ensure they're still valid
  // if neither type nor permissions are changing, we don't need to validate again or else we can't allow partial update
  if (attributes.permissions || changingTypeToCustom) {
    assertCustomTokenPermissionsValidity(
      attributes.type || originalToken.type,
      attributes.permissions || originalToken.permissions
    );
  }

  assertValidLifespan(attributes.lifespan);

  const updatedToken: ApiToken = await strapi.db.query('admin::api-token').update({
    select: SELECT_FIELDS,
    where: { id },
    data: omit('permissions', attributes),
  });

  // custom tokens need to have their permissions updated as well
  if (updatedToken.type === constants.API_TOKEN_TYPE.CUSTOM && attributes.permissions) {
    const currentPermissionsResult = await strapi.db
      .query('admin::api-token')
      .load(updatedToken, 'permissions');

    const currentPermissions = map('action', currentPermissionsResult || []);
    const newPermissions = uniq(attributes.permissions);

    const actionsToDelete = difference(currentPermissions, newPermissions);
    const actionsToAdd = difference(newPermissions, currentPermissions);

    // TODO: improve efficiency here
    // method using a loop -- works but very inefficient
    await Promise.all(
      actionsToDelete.map((action) =>
        strapi.db.query('admin::api-token-permission').delete({
          where: { action, token: id },
        })
      )
    );

    // TODO: improve efficiency here
    // using a loop -- works but very inefficient
    await Promise.all(
      actionsToAdd.map((action) =>
        strapi.db.query('admin::api-token-permission').create({
          data: { action, token: id },
        })
      )
    );
  }
  // if type is not custom, make sure any old permissions get removed
  else if (updatedToken.type !== constants.API_TOKEN_TYPE.CUSTOM) {
    await strapi.db.query('admin::api-token-permission').delete({
      where: { token: id },
    });
  }

  // retrieve permissions
  const permissionsFromDb = await strapi.db
    .query('admin::api-token')
    .load(updatedToken, 'permissions');

  return {
    ...updatedToken,
    permissions: permissionsFromDb ? permissionsFromDb.map((p: any) => p.action) : undefined,
  };
};

export {
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
