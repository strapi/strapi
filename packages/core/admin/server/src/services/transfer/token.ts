import crypto from 'crypto';
import assert from 'assert';
import { map, isArray, omit, uniq, isNil, difference, isEmpty, isNumber } from 'lodash/fp';
import { errors } from '@strapi/utils';
import '@strapi/types';
import constants from '../constants';
import { getService } from '../../utils';
import {
  DatabaseTransferToken,
  SanitizedTransferToken,
  TokenCreatePayload,
  TokenUpdatePayload,
  TransferToken,
  TransferTokenPermission,
} from '../../../../shared/contracts/transfer';

const { ValidationError, NotFoundError } = errors;

const TRANSFER_TOKEN_UID = 'admin::transfer-token';
const TRANSFER_TOKEN_PERMISSION_UID = 'admin::transfer-token-permission';

const SELECT_FIELDS = [
  'id',
  'name',
  'description',
  'lastUsedAt',
  'lifespan',
  'expiresAt',
  'createdAt',
  'updatedAt',
] as const;

const POPULATE_FIELDS = ['permissions'] as const;

/**
 * Return a list of all tokens and their permissions
 */
const list = async (): Promise<SanitizedTransferToken[]> => {
  const tokens: DatabaseTransferToken[] = await strapi.db.query(TRANSFER_TOKEN_UID).findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
  });

  if (!tokens) return tokens;
  return tokens.map((token) => flattenTokenPermissions(token));
};

/**
 * Create a random token's access key
 */
const generateRandomAccessKey = (): string => crypto.randomBytes(128).toString('hex');

/**
 * Validate the given access key's format and returns it if valid
 */
const validateAccessKey = (accessKey: string): string => {
  assert(typeof accessKey === 'string', 'Access key needs to be a string');
  assert(accessKey.length >= 15, 'Access key needs to have at least 15 characters');

  return accessKey;
};

export const hasAccessKey = <T extends { accessKey?: string }>(
  attributes: T
): attributes is T & { accessKey: string } => {
  return 'accessKey' in attributes;
};

/**
 * Create a token and its permissions
 */
const create = async (attributes: TokenCreatePayload): Promise<TransferToken> => {
  const accessKey = hasAccessKey(attributes)
    ? validateAccessKey(attributes.accessKey)
    : generateRandomAccessKey();

  // Make sure the access key isn't picked up directly from the attributes for the next steps
  delete attributes.accessKey;

  assertTokenPermissionsValidity(attributes);
  assertValidLifespan(attributes.lifespan);

  const result = (await strapi.db.transaction(async () => {
    const transferToken = await strapi.db.query(TRANSFER_TOKEN_UID).create({
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
        strapi.db
          .query(TRANSFER_TOKEN_PERMISSION_UID)
          .create({ data: { action, token: transferToken } })
      )
    );

    const currentPermissions: TransferTokenPermission[] = await strapi.db
      .query(TRANSFER_TOKEN_UID)
      .load(transferToken, 'permissions');

    if (currentPermissions) {
      Object.assign(transferToken, { permissions: map('action', currentPermissions) });
    }

    return transferToken;
  })) as TransferToken;

  return { ...result, accessKey };
};

/**
 * Update a token and its permissions
 */
const update = async (
  id: string | number,
  attributes: TokenUpdatePayload
): Promise<SanitizedTransferToken> => {
  // retrieve token without permissions
  const originalToken = await strapi.db.query(TRANSFER_TOKEN_UID).findOne({ where: { id } });

  if (!originalToken) {
    throw new NotFoundError('Token not found');
  }

  assertTokenPermissionsValidity(attributes);
  assertValidLifespan(attributes.lifespan);

  return strapi.db.transaction(async () => {
    const updatedToken = await strapi.db.query(TRANSFER_TOKEN_UID).update({
      select: SELECT_FIELDS,
      where: { id },
      data: {
        ...omit('permissions', attributes),
      },
    });

    if (attributes.permissions) {
      const currentPermissionsResult = await strapi.db
        .query(TRANSFER_TOKEN_UID)
        .load(updatedToken, 'permissions');

      const currentPermissions = map('action', currentPermissionsResult || []);
      const newPermissions = uniq(attributes.permissions);

      const actionsToDelete = difference(currentPermissions, newPermissions);
      const actionsToAdd = difference(newPermissions, currentPermissions);

      // TODO: improve efficiency here
      // method using a loop -- works but very inefficient
      await Promise.all(
        actionsToDelete.map((action) =>
          strapi.db.query(TRANSFER_TOKEN_PERMISSION_UID).delete({
            where: { action, token: id },
          })
        )
      );

      // TODO: improve efficiency here
      // using a loop -- works but very inefficient
      await Promise.all(
        actionsToAdd.map((action) =>
          strapi.db.query(TRANSFER_TOKEN_PERMISSION_UID).create({
            data: { action, token: id },
          })
        )
      );
    }

    // retrieve permissions
    const permissionsFromDb: TransferTokenPermission[] = await strapi.db
      .query(TRANSFER_TOKEN_UID)
      .load(updatedToken, 'permissions');

    return {
      ...updatedToken,
      permissions: permissionsFromDb ? permissionsFromDb.map((p) => p.action) : undefined,
    };
  }) as unknown as Promise<SanitizedTransferToken>;
};

/**
 * Revoke (delete) a token
 */
const revoke = async (id: string | number): Promise<SanitizedTransferToken> => {
  return strapi.db.transaction(async () =>
    strapi.db
      .query(TRANSFER_TOKEN_UID)
      .delete({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: { id } })
  ) as unknown as Promise<SanitizedTransferToken>;
};

/**
 *  Get a token
 */
const getBy = async (
  whereParams = {} as {
    id?: string | number;
    name?: string;
    lastUsedAt?: number;
    description?: string;
    accessKey?: string;
  }
): Promise<SanitizedTransferToken | null> => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  const token = await strapi.db
    .query(TRANSFER_TOKEN_UID)
    .findOne({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: whereParams });

  if (!token) {
    return token;
  }

  return flattenTokenPermissions(token);
};

/**
 * Retrieve a token by id
 */
const getById = async (id: string | number): Promise<SanitizedTransferToken | null> => {
  return getBy({ id });
};

/**
 * Retrieve a token by name
 */
const getByName = async (name: string): Promise<SanitizedTransferToken | null> => {
  return getBy({ name });
};

/**
 * Check if token exists
 */
const exists = async (
  whereParams = {} as {
    id?: string | number;
    name?: string;
    lastUsedAt?: number;
    description?: string;
    accessKey?: string;
  }
): Promise<boolean> => {
  const transferToken = await getBy(whereParams);

  return !!transferToken;
};

const regenerate = async (id: string | number): Promise<TransferToken> => {
  const accessKey = crypto.randomBytes(128).toString('hex');
  const transferToken = (await strapi.db.transaction(async () =>
    strapi.db.query(TRANSFER_TOKEN_UID).update({
      select: ['id', 'accessKey'],
      where: { id },
      data: {
        accessKey: hash(accessKey),
      },
    })
  )) as Promise<TransferToken>;

  if (!transferToken) {
    throw new NotFoundError('The provided token id does not exist');
  }

  return {
    ...transferToken,
    accessKey,
  };
};

const getExpirationFields = (lifespan: TransferToken['lifespan']) => {
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
 * Return a secure sha512 hash of an accessKey
 */
const hash = (accessKey: string): string => {
  const { hasValidTokenSalt } = getService('transfer').utils;

  if (!hasValidTokenSalt()) {
    throw new TypeError('Required token salt is not defined');
  }

  return crypto
    .createHmac('sha512', strapi.config.get('admin.transfer.token.salt'))
    .update(accessKey)
    .digest('hex');
};

const checkSaltIsDefined = () => {
  const { hasValidTokenSalt } = getService('transfer').utils;

  // Ignore the check if the data-transfer feature is manually disabled
  if (!strapi.config.get('server.transfer.remote.enabled')) {
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
 */
const flattenTokenPermissions = (token: DatabaseTransferToken): TransferToken => {
  if (!token) {
    return token;
  }

  return {
    ...token,
    permissions: isArray(token.permissions)
      ? map('action', token.permissions as TransferTokenPermission[])
      : token.permissions,
  };
};

/**
 * Assert that a token's permissions are valid
 */
const assertTokenPermissionsValidity = (attributes: TokenUpdatePayload) => {
  const permissionService = strapi.service('admin::transfer').permission;
  const validPermissions = permissionService.providers.action.keys();
  const invalidPermissions = difference(attributes.permissions, validPermissions);

  if (!isEmpty(invalidPermissions)) {
    throw new ValidationError(`Unknown permissions provided: ${invalidPermissions.join(', ')}`);
  }
};

/**
 * Check if a token's lifespan is valid
 */
const isValidLifespan = (lifespan: unknown) => {
  if (isNil(lifespan)) {
    return true;
  }

  if (
    !isNumber(lifespan) ||
    !Object.values(constants.TRANSFER_TOKEN_LIFESPANS).includes(lifespan)
  ) {
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
      ${Object.values(constants.TRANSFER_TOKEN_LIFESPANS).join(', ')}`
    );
  }
};

export {
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
