import crypto from 'crypto';
import { omit, difference, isNil, isEmpty, isArray, isNumber } from 'lodash/fp';
import permissions from '@strapi/permissions';
import { errors } from '@strapi/utils';
import type { Ability } from '@casl/ability';
import constants from './constants';
import { getService } from '../utils';
import type { Permission } from '../../../shared/contracts/shared';
import permissionDomain from '../domain/permission';

const { ValidationError, NotFoundError } = errors;

type DBAppToken = AppToken & {
  permissions: (number | Permission)[];
  user: any;
};

export type AppToken = {
  id: number | `${number}`;
  name: string;
  description: string;
  type: 'inherit' | 'custom';
  accessKey?: string;
  lastUsedAt: string | null;
  expiresAt: number | null;
  lifespan: number | null;
  permissions?: Permission[];
  user: any;
  createdAt: string;
  updatedAt: string;
};

export type AppTokenBody = {
  name: string;
  description?: string;
  type: 'inherit' | 'custom';
  permissions?: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
  lifespan?: number | null;
  userId: number | string;
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

const POPULATE_FIELDS = ['permissions', 'user'];

/**
 * Assert that a token's permissions attribute is valid for its type
 */
const assertCustomTokenPermissionsValidity = (
  type: AppTokenBody['type'],
  permissions: AppTokenBody['permissions']
) => {
  // Ensure non-custom tokens doesn't have permissions
  if (type !== constants.APP_TOKEN_TYPE.CUSTOM && !isEmpty(permissions)) {
    throw new ValidationError('Non-custom tokens should not reference permissions');
  }

  // Custom type tokens should always have permissions attached to them
  if (type === constants.APP_TOKEN_TYPE.CUSTOM && !isArray(permissions)) {
    throw new ValidationError('Missing permissions attribute for custom token');
  }

  // Permissions provided for a custom type token should be valid/registered admin permissions
  if (type === constants.APP_TOKEN_TYPE.CUSTOM) {
    const validPermissions = getService('permission').actionProvider.keys();
    const permissionActions = permissions?.map((p) => p.action) ?? [];
    const invalidPermissions = difference(permissionActions, validPermissions) as string[];

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
 * Ensure permissions are properly formatted Permission objects
 */
const flattenTokenPermissions = (token: DBAppToken): AppToken => {
  if (!token) {
    return token;
  }

  // Permissions are already full objects from admin::permission
  // Just ensure they're properly formatted
  return {
    ...token,
    permissions: isArray(token.permissions) ? token.permissions : [],
  };
};

type WhereParams = {
  id?: string | number;
  name?: string;
  lastUsedAt?: number;
  description?: string;
  accessKey?: string;
  userId?: string | number;
};

/**
 *  Get a token
 */
const getBy = async (whereParams: WhereParams = {}): Promise<AppToken | null> => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  const { userId, ...rest } = whereParams;
  const where: any = { ...rest };

  if (userId !== undefined) {
    where.user = { id: userId };
  }

  const token = await strapi.db.query('admin::app-token').findOne({
    select: [...SELECT_FIELDS, 'encryptedKey'],
    populate: POPULATE_FIELDS,
    where,
  });

  if (!token) {
    return token;
  }

  const { encryptedKey, ...tokenRest } = token;

  if (!encryptedKey) {
    return flattenTokenPermissions(tokenRest);
  }

  const accessKey = getService('encryption').decrypt(encryptedKey);

  return flattenTokenPermissions({
    ...tokenRest,
    accessKey,
  });
};

/**
 * Check if token exists
 */
const exists = async (whereParams: WhereParams = {}): Promise<boolean> => {
  const appToken = await getBy(whereParams);

  return !!appToken;
};

/**
 * Return a secure sha512 hash of an accessKey
 */
const hash = (accessKey: string) => {
  return crypto
    .createHmac('sha512', strapi.config.get('admin.appToken.salt'))
    .update(accessKey)
    .digest('hex');
};

const getExpirationFields = (lifespan: AppTokenBody['lifespan']) => {
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
const create = async (attributes: AppTokenBody): Promise<AppToken> => {
  const encryptionService = getService('encryption');
  const accessKey = crypto.randomBytes(128).toString('hex');
  const encryptedKey = encryptionService.encrypt(accessKey);

  assertCustomTokenPermissionsValidity(attributes.type, attributes.permissions);
  assertValidLifespan(attributes.lifespan);

  // Create the token
  const appToken: AppToken = await strapi.db.query('admin::app-token').create({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    data: {
      ...omit(['permissions', 'userId'], attributes),
      user: attributes.userId,
      accessKey: hash(accessKey),
      encryptedKey,
      ...getExpirationFields(attributes.lifespan),
    },
  });

  const result: AppToken = { ...appToken, accessKey };

  // If this is a custom type token, create the related permissions
  if (attributes.type === constants.APP_TOKEN_TYPE.CUSTOM && attributes.permissions) {
    const permissionsWithToken = attributes.permissions.map((perm) => ({
      ...permissionDomain.create(perm),
      token: appToken,
    }));

    const createdPermissions = await getService('permission').createMany(permissionsWithToken);
    Object.assign(result, { permissions: createdPermissions });
  }

  return result;
};

/**
 * Regenerate a token's access key
 */
const regenerate = async (id: string | number): Promise<AppToken> => {
  const accessKey = crypto.randomBytes(128).toString('hex');
  const encryptionService = getService('encryption');
  const encryptedKey = encryptionService.encrypt(accessKey);

  const appToken: AppToken = await strapi.db.query('admin::app-token').update({
    select: ['id', 'accessKey'],
    where: { id },
    data: {
      accessKey: hash(accessKey),
      encryptedKey,
    },
  });

  if (!appToken) {
    throw new NotFoundError('The provided token id does not exist');
  }

  return {
    ...appToken,
    accessKey,
  };
};

/**
 * Check that the salt is defined
 */
const checkSaltIsDefined = () => {
  if (!strapi.config.get('admin.appToken.salt')) {
    throw new Error(
      `Missing appToken.salt. Please set appToken.salt in config/admin.(ts|js). You can generate one using Node with \`crypto.randomBytes(16).toString('base64')\`.
For security reasons, prefer storing the secret in an environment variable and read it in config/admin.(ts|js). See https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#configuration-using-environment-variables.`
    );
  }
};

/**
 * Return a list of all tokens and their permissions for a user
 */
const list = async (userId?: string | number): Promise<Array<AppToken>> => {
  const where: any = {};
  if (userId !== undefined) {
    where.user = { id: userId };
  }

  const tokens: Array<DBAppToken> = await strapi.db.query('admin::app-token').findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    where,
    orderBy: { name: 'ASC' },
  });

  if (!tokens) {
    return tokens;
  }

  return tokens.map((token) => flattenTokenPermissions(token));
};

/**
 * Update a token
 */
const update = async (
  id: string | number,
  attributes: Partial<AppTokenBody>
): Promise<AppToken> => {
  const appToken = await strapi.db.query('admin::app-token').findOne({
    where: { id },
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
  });

  if (!appToken) {
    throw new NotFoundError('The provided token id does not exist');
  }

  // If updating permissions, handle the relation updates
  if (attributes.permissions !== undefined) {
    const existingPermissions = await getService('permission').findMany({
      where: { token: { id: appToken.id } },
    });

    // Delete old permissions
    if (existingPermissions.length > 0) {
      await getService('permission').deleteByIds(existingPermissions.map((p) => p.id));
    }

    // Create new permissions if type is custom
    if (attributes.type === constants.APP_TOKEN_TYPE.CUSTOM && attributes.permissions.length > 0) {
      const permissionsWithToken = attributes.permissions.map((perm) => ({
        ...permissionDomain.create(perm),
        token: { id: appToken.id },
      }));

      await getService('permission').createMany(permissionsWithToken);
    }
  }

  // Update the token
  const updatedToken = await strapi.db.query('admin::app-token').update({
    where: { id },
    select: [...SELECT_FIELDS, 'encryptedKey'],
    populate: POPULATE_FIELDS,
    data: omit('permissions', attributes),
  });

  const { encryptedKey, ...tokenRest } = updatedToken;

  if (!encryptedKey) {
    return flattenTokenPermissions(tokenRest);
  }

  const accessKey = getService('encryption').decrypt(encryptedKey);

  return flattenTokenPermissions({
    ...tokenRest,
    accessKey,
  });
};

/**
 * Revoke (delete) a token
 */
const revoke = async (id: string | number): Promise<AppToken> => {
  return strapi.db
    .query('admin::app-token')
    .delete({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: { id } });
};

/**
 * Retrieve a token by id
 */
const getById = async (id: string | number) => {
  return getBy({ id });
};

/**
 * Assign permissions to a token
 */
const assignPermissions = async (
  id: string | number,
  permissions: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[],
  type: 'inherit' | 'custom'
): Promise<Permission[]> => {
  const appToken = await strapi.db.query('admin::app-token').findOne({
    where: { id },
  });

  if (!appToken) {
    throw new NotFoundError('The provided token id does not exist');
  }

  // Delete existing permissions
  const existingPermissions = await getService('permission').findMany({
    where: { token: { id: appToken.id } },
  });

  if (existingPermissions.length > 0) {
    await getService('permission').deleteByIds(existingPermissions.map((p) => p.id));
  }

  // Update token type
  await strapi.db.query('admin::app-token').update({
    where: { id },
    data: { type },
  });

  // Create new permissions if type is custom
  if (type === constants.APP_TOKEN_TYPE.CUSTOM && permissions.length > 0) {
    const permissionsWithToken = permissions.map((perm) => ({
      ...permissionDomain.create(perm),
      token: appToken,
    }));

    return getService('permission').createMany(permissionsWithToken);
  }

  return [];
};

/**
 * Compute effective ability for a token
 * This is the intersection of the user's role ability and the token's allowlist
 */
const computeEffectiveAbility = async ({
  user,
  token,
}: {
  user: any;
  token: AppToken;
}): Promise<Ability> => {
  const permissionService = getService('permission');

  // If the token inherits all permissions, generate ability from user's roles
  if (token.type === constants.APP_TOKEN_TYPE.INHERIT) {
    return permissionService.engine.generateUserAbility(user);
  }

  // For custom tokens, we need to filter the user's permissions by the token's allowlist
  // This creates an ability that only allows actions that are both:
  // 1. Allowed by the user's role
  // 2. In the token's allowlist
  if (token.type === constants.APP_TOKEN_TYPE.CUSTOM) {
    const tokenPermissions = token.permissions || [];

    // Get all permissions from the user's roles
    const userPermissions = await permissionService.findUserPermissions(user);

    // Filter to only those in the allowlist
    const effectivePermissions = userPermissions.filter((perm) =>
      tokenPermissions.some((p) => p.action === perm.action && p.subject === perm.subject)
    );

    // Generate a new ability from the filtered permissions
    const providers = {
      action: permissionService.actionProvider,
      condition: permissionService.conditionProvider,
    };
    const tempEngine = permissions.engine.new({ providers });
    return tempEngine.generateAbility(
      // @ts-expect-error - local vs monorepo type resolution mismatch
      effectivePermissions,
      user
    );
  }

  // Fallback - should never reach here
  return permissionService.engine.generateUserAbility(user);
};

export {
  checkSaltIsDefined,
  list,
  create,
  update,
  revoke,
  getById,
  getBy,
  regenerate,
  hash,
  exists,
  assignPermissions,
  computeEffectiveAbility,
};
