import crypto from 'crypto';
import { omit, isNil, isNumber } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Data } from '@strapi/types';
import constants from './constants';
import { getService } from '../utils';

const { ValidationError, NotFoundError } = errors;

type ServiceAccountToken = {
  id: Data.ID;
  name: string;
  description: string;
  accessKey?: string;
  encryptedKey?: string;
  lastUsedAt: string | null;
  roles: Array<{ id: Data.ID; name: string; code: string }>;
  expiresAt: string | null;
  lifespan: string | number | null;
  createdAt: string;
  updatedAt: string;
};

type ServiceAccountTokenBody = {
  name: string;
  description?: string;
  roles: Data.ID[];
  lifespan?: string | number | null;
};

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

const POPULATE_FIELDS = ['roles'];

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
const getBy = async (whereParams: WhereParams = {}): Promise<ServiceAccountToken | null> => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  const token = await strapi.db.query('admin::service-account-token').findOne({
    select: [...SELECT_FIELDS, 'encryptedKey'],
    populate: POPULATE_FIELDS,
    where: whereParams,
  });

  if (!token) {
    return null;
  }

  const { encryptedKey, ...rest } = token;

  // Ensure roles are populated as objects
  const populatedRoles = Array.isArray(rest.roles)
    ? rest.roles.filter((r: unknown) => typeof r === 'object' && r !== null)
    : [];

  if (!encryptedKey) {
    return {
      ...rest,
      roles: populatedRoles,
    };
  }

  const accessKey = getService('encryption').decrypt(encryptedKey);

  return {
    ...rest,
    accessKey,
    roles: populatedRoles,
  };
};

/**
 * Check if token exists
 */
const exists = async (whereParams: WhereParams = {}): Promise<boolean> => {
  const token = await getBy(whereParams);

  return !!token;
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

const getExpirationFields = (lifespan: ServiceAccountTokenBody['lifespan']) => {
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
 * Create a service account token
 */
const create = async (attributes: ServiceAccountTokenBody): Promise<ServiceAccountToken> => {
  const encryptionService = getService('encryption');
  const accessKey = crypto.randomBytes(128).toString('hex');
  const encryptedKey = encryptionService.encrypt(accessKey);

  assertValidLifespan(attributes.lifespan);

  // Verify all roles exist
  if (attributes.roles.length === 0) {
    throw new ValidationError('At least one role is required');
  }

  const roles = await strapi.db.query('admin::role').findMany({
    where: { id: { $in: attributes.roles } },
  });

  if (roles.length !== attributes.roles.length) {
    throw new NotFoundError('One or more roles not found');
  }

  // Create the token
  const serviceAccountToken = await strapi.db.query('admin::service-account-token').create({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    data: {
      ...omit('roles', attributes),
      roles: attributes.roles,
      accessKey: hash(accessKey),
      encryptedKey,
      ...getExpirationFields(attributes.lifespan),
    },
  });

  const result: ServiceAccountToken = {
    ...serviceAccountToken,
    accessKey,
    roles: Array.isArray(serviceAccountToken.roles)
      ? serviceAccountToken.roles.filter((r: unknown) => typeof r === 'object' && r !== null)
      : [],
  };

  return result;
};

const regenerate = async (id: string | number): Promise<ServiceAccountToken> => {
  const accessKey = crypto.randomBytes(128).toString('hex');
  const encryptionService = getService('encryption');
  const encryptedKey = encryptionService.encrypt(accessKey);

  const serviceAccountToken = await strapi.db.query('admin::service-account-token').findOne({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    where: { id },
  });

  if (!serviceAccountToken) {
    throw new NotFoundError('The provided token id does not exist');
  }

  await strapi.db.query('admin::service-account-token').update({
    where: { id },
    data: {
      accessKey: hash(accessKey),
      encryptedKey,
    },
  });

  const populatedRoles = Array.isArray(serviceAccountToken.roles)
    ? serviceAccountToken.roles.filter((r: unknown) => typeof r === 'object' && r !== null)
    : [];

  return {
    ...serviceAccountToken,
    accessKey,
    roles: populatedRoles,
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
 * Return a list of all tokens
 */
const list = async (): Promise<Array<ServiceAccountToken>> => {
  const tokens = await strapi.db.query('admin::service-account-token').findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
  });

  if (!tokens) {
    return [];
  }

  // Ensure all roles are populated as objects
  return tokens.map((token) => ({
    ...token,
    roles: Array.isArray(token.roles)
      ? token.roles.filter((r: unknown) => typeof r === 'object' && r !== null)
      : [],
  })) as ServiceAccountToken[];
};

/**
 * Revoke (delete) a token
 */
const revoke = async (id: string | number): Promise<ServiceAccountToken> => {
  const token = await strapi.db.query('admin::service-account-token').delete({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    where: { id },
  });

  if (!token) {
    throw new NotFoundError('Token not found');
  }

  const populatedRoles = Array.isArray(token.roles)
    ? token.roles.filter((r: unknown) => typeof r === 'object' && r !== null)
    : [];

  return {
    ...token,
    roles: populatedRoles,
  };
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
 * Update a token
 */
const update = async (
  id: string | number,
  attributes: Partial<ServiceAccountTokenBody>
): Promise<ServiceAccountToken> => {
  const originalToken = await strapi.db.query('admin::service-account-token').findOne({
    where: { id },
    populate: POPULATE_FIELDS,
  });

  if (!originalToken) {
    throw new NotFoundError('Token not found');
  }

  assertValidLifespan(attributes.lifespan);

  // If roles are being updated, verify they all exist
  if (attributes.roles !== undefined) {
    if (attributes.roles.length === 0) {
      throw new ValidationError('At least one role is required');
    }

    const roles = await strapi.db.query('admin::role').findMany({
      where: { id: { $in: attributes.roles } },
    });

    if (roles.length !== attributes.roles.length) {
      throw new NotFoundError('One or more roles not found');
    }
  }

  const updatedToken = await strapi.db.query('admin::service-account-token').update({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    where: { id },
    data: {
      ...omit('roles', attributes),
      ...(attributes.roles !== undefined ? { roles: attributes.roles } : {}),
      ...(attributes.lifespan !== undefined ? getExpirationFields(attributes.lifespan) : {}),
    },
  });

  const populatedRoles = Array.isArray(updatedToken.roles)
    ? updatedToken.roles.filter((r: unknown) => typeof r === 'object' && r !== null)
    : [];

  return {
    ...updatedToken,
    roles: populatedRoles,
  };
};

const count = async (where = {}): Promise<number> => {
  return strapi.db.query('admin::service-account-token').count({ where });
};

export {
  create,
  count,
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

export type { ServiceAccountToken, ServiceAccountTokenBody };
