import crypto from 'crypto';
import {
  omit,
  difference,
  isNil,
  isEmpty,
  map,
  isArray,
  uniq,
  isNumber,
  differenceWith,
  isEqual,
  pick,
  prop,
} from 'lodash/fp';
import type { Core, Data } from '@strapi/types';
import { errors } from '@strapi/utils';
import type {
  Update,
  ContentApiApiToken,
  ContentApiApiTokenBody,
} from '../../../shared/contracts/api-token';
import type { AdminApiToken, AdminTokenBody } from '../../../shared/contracts/admin-token';
import type { AdminUser, Permission } from '../../../shared/contracts/shared';
import constants from './constants';
import { getService } from '../utils';
import permissionDomain from '../domain/permission';
import { validatePermissionsExist } from '../validation/permission';

type AnyApiToken = ContentApiApiToken | AdminApiToken;

const { SUPER_ADMIN_CODE } = constants;

const { ValidationError, NotFoundError } = errors;

const assertOwnerMatchesCallingUser = async (
  adminUserOwner: Data.ID,
  callingUser: AdminUser | undefined
): Promise<void> => {
  if (callingUser === undefined || callingUser === null) {
    throw new ValidationError('adminUserOwner requires an authenticated admin user');
  }

  const ownerId = String(adminUserOwner);
  const callingUserId = String(callingUser.id);

  if (ownerId !== callingUserId) {
    throw new ValidationError('adminUserOwner must match the authenticated admin user');
  }

  const existingUser = await strapi.db.query('admin::user').findOne({
    select: ['id'],
    where: { id: callingUser.id },
  });

  if (existingUser === null || existingUser === undefined) {
    throw new ValidationError('adminUserOwner must reference an existing admin user');
  }
};

const isSuperAdmin = (user: AdminUser | undefined): boolean =>
  user?.roles?.some((r) => r.code === SUPER_ADMIN_CODE) === true;

const getOwnerId = (token: AdminApiToken): string => {
  const owner = token.adminUserOwner;
  return String(typeof owner === 'object' ? owner.id : owner);
};

const SELECT_FIELDS = [
  'id',
  'kind',
  'name',
  'description',
  'lastUsedAt',
  'type',
  'lifespan',
  'expiresAt',
  'createdAt',
  'updatedAt',
];

const POPULATE_FIELDS = ['permissions', 'adminPermissions', 'adminUserOwner'];

// TODO: we need to ensure the permissions are actually valid registered permissions!

/**
 * Assert that a token's permissions attribute is valid for its type
 */
const assertCustomTokenPermissionsValidity = (
  type: ContentApiApiToken['type'],
  permissions: string[] | null | undefined
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

/** API/body shape: permission without ids/timestamps and without actionParameters (defaulted by domain when creating). */
type PermissionInput = Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>;

/**
 * Assert that a legacy-kind token body does not carry admin-only fields
 */
const assertLegacyKindFields = (attributes: ContentApiApiTokenBody): void => {
  const raw = attributes as Record<string, unknown>;
  if (raw.adminPermissions !== undefined && raw.adminPermissions !== null) {
    throw new ValidationError('Legacy tokens cannot carry admin permissions');
  }
  if (raw.adminUserOwner !== undefined && raw.adminUserOwner !== null) {
    throw new ValidationError('Legacy tokens cannot have an admin user owner');
  }
};

/**
 * Assert that an admin-kind token body does not carry legacy-only fields
 */
const assertAdminKindFields = (attributes: AdminTokenBody): void => {
  const raw = attributes as Record<string, unknown>;
  if (raw.type !== undefined && raw.type !== null) {
    throw new ValidationError(
      'Admin tokens cannot carry a legacy type (custom/read-only/full-access)'
    );
  }
  if (raw.permissions !== undefined && raw.permissions !== null) {
    throw new ValidationError('Admin tokens cannot carry legacy content-API permissions');
  }
};

/**
 * Assert that admin permissions are valid
 */
const assertAdminPermissionsValidity = async (adminPermissions?: PermissionInput[]) => {
  if (!adminPermissions || adminPermissions.length === 0) {
    return;
  }

  // Validate that all actions exist in the admin action provider
  const validActions = getService('permission').actionProvider.keys();

  for (const perm of adminPermissions) {
    if (!validActions.includes(perm.action)) {
      throw new ValidationError(`Unknown admin action: ${perm.action}`);
    }
  }

  // Use existing permission validation
  await validatePermissionsExist(adminPermissions as any);
};

/**
 * Enforce that every requested admin permission stays within the calling
 * user's own permission ceiling, then return the clamped permissions.
 *
 * Super-admins bypass this (they hold every permission).
 * When admin permissions are requested, an authenticated user is required (no bypass when user is missing).
 *
 * For each requested permission:
 *  - action + subject must match at least one user permission
 *  - properties.fields must be ⊆ user's properties.fields
 *    (if the user's permission defines no fields, all fields are allowed)
 *  - conditions are inherited from the user's matching permission(s);
 *    the caller cannot configure conditions on their own tokens
 *
 * Returns the permissions with conditions enforced from the user's role.
 * Throws ValidationError if any permission exceeds the user's ceiling.
 *
 * Guaranteed postcondition: all returned permissions have conditions filtered to
 * registered conditions only, regardless of the user type.
 */
const enforceAdminPermissionsCeiling = async (
  user: AdminUser | undefined | null,
  requestedPermissions?: PermissionInput[]
): Promise<PermissionInput[]> => {
  if (!requestedPermissions || requestedPermissions.length === 0) {
    return requestedPermissions || [];
  }
  if (user === undefined || user === null) {
    throw new ValidationError(
      'Admin permission ceiling cannot be enforced without an authenticated user'
    );
  }
  if (isSuperAdmin(user)) {
    // Sanitize conditions even for super-admins so this function is a complete boundary.
    // createApiTokenAdminPermissions also sanitizes, but relying on that downstream
    // is fragile — any future call path that skips it would store invalid conditions.
    const { conditionProvider } = getService('permission');
    const sanitize = permissionDomain.sanitizeConditions(conditionProvider as any);
    return requestedPermissions.map((perm) => {
      const sanitized = sanitize({ ...perm, actionParameters: {} } as Permission);
      return { ...perm, conditions: sanitized.conditions };
    });
  }

  const userPermissions: Permission[] = await getService('permission').findUserPermissions(user);

  const exceeding: string[] = [];

  const clamped = requestedPermissions.map((requested) => {
    const requestedSubject = requested.subject || null;

    // Find all user permissions matching action + subject
    const matchingUserPerms = userPermissions.filter((userPerm: Permission) => {
      if (userPerm.action !== requested.action) return false;
      const userSubject = userPerm.subject || null;
      return requestedSubject === userSubject;
    });

    const label =
      requestedSubject !== null ? `${requested.action} on ${requestedSubject}` : requested.action;

    if (matchingUserPerms.length === 0) {
      exceeding.push(label);
      return requested;
    }

    // --- Field-level ceiling ---
    // If any matching user perm has no fields defined → all fields are allowed.
    // Otherwise, effective user fields = union of all matching perms' fields.
    const anyUserPermHasAllFields = matchingUserPerms.some(
      (p) => !p.properties?.fields || p.properties.fields.length === 0
    );

    const requestedFields = requested.properties?.fields;

    if (
      !anyUserPermHasAllFields &&
      requestedFields !== undefined &&
      requestedFields !== null &&
      requestedFields.length > 0
    ) {
      const effectiveUserFields = uniq(
        matchingUserPerms.flatMap((p) => p.properties?.fields || [])
      );

      const exceedingFields = requestedFields.filter((f) => !effectiveUserFields.includes(f));

      if (exceedingFields.length > 0) {
        exceeding.push(`${label} (fields: ${exceedingFields.join(', ')})`);
        return requested;
      }
    }

    // --- Condition-level ceiling ---
    // Conditions are always inherited from the user's matching permission(s).
    // If any matching user perm is unconditional → token gets no conditions.
    // Otherwise → union of conditions across matching perms.
    const anyUserPermIsUnconditional = matchingUserPerms.some(
      (p) => !p.conditions || p.conditions.length === 0
    );

    const enforcedConditions: string[] = anyUserPermIsUnconditional
      ? []
      : (uniq(matchingUserPerms.flatMap((p) => p.conditions || [])) as string[]);

    return {
      ...requested,
      conditions: enforcedConditions,
    };
  });

  if (exceeding.length > 0) {
    throw new ValidationError(
      `Cannot assign admin permissions that exceed your own. ` +
        `Exceeding: ${exceeding.join(', ')}`
    );
  }

  return clamped;
};

/**
 * Create admin permissions for an API token
 */
const createApiTokenAdminPermissions = async (tokenId: Data.ID, permissions: PermissionInput[]) => {
  const { conditionProvider } = getService('permission');
  const sanitizeConditions = permissionDomain.sanitizeConditions(conditionProvider as any);

  const permissionsWithToken = permissions.map((perm) => {
    const permAsPermission = { ...perm, actionParameters: {} } as Permission;
    const sanitized = sanitizeConditions(permAsPermission);
    return permissionDomain.create({
      ...sanitized,
      apiToken: tokenId as any,
      role: null,
    } as any);
  });

  const createdPermissions = await getService('permission').createMany(permissionsWithToken as any);

  return createdPermissions;
};

/**
 * Fields to compare when checking if two permissions are equal
 */
const COMPARABLE_FIELDS = ['conditions', 'properties', 'subject', 'action', 'actionParameters'];
const pickComparableFields = pick(COMPARABLE_FIELDS);

/**
 * Helper to clean JSON (remove undefined values)
 */
const jsonClean = <T extends object>(data: T): T => JSON.parse(JSON.stringify(data));

/**
 * Compare two permissions for equality
 */
const arePermissionsEqual = (p1: Permission, p2: Permission): boolean => {
  if (p1.action === p2.action) {
    return isEqual(jsonClean(pickComparableFields(p1)), jsonClean(pickComparableFields(p2)));
  }
  return false;
};

/**
 * Assign admin permissions to an API token (similar to role permission assignment).
 * ceilingUser is the user whose permissions act as the ceiling — always the token owner,
 * regardless of who is making the request.
 */
const assignAdminPermissionsToToken = async (
  tokenId: Data.ID,
  permissions: PermissionInput[],
  ceilingUser: AdminUser
): Promise<Permission[]> => {
  await validatePermissionsExist(permissions as any);
  const clampedPermissions = await enforceAdminPermissionsCeiling(ceilingUser, permissions);

  const permissionsWithToken = clampedPermissions.map((perm) =>
    permissionDomain.create({
      ...perm,
      apiToken: tokenId as any,
      role: null,
    } as any)
  );

  const existingPermissions = await getService('permission').findMany({
    where: { apiToken: { id: tokenId } },
  });

  const permissionsToAdd = differenceWith(
    arePermissionsEqual,
    permissionsWithToken,
    existingPermissions
  ) as any as Permission[];

  const permissionsToDelete = differenceWith(
    arePermissionsEqual,
    existingPermissions,
    permissionsWithToken
  ) as any as Permission[];

  if (permissionsToDelete.length > 0) {
    await getService('permission').deleteByIds(permissionsToDelete.map(prop('id')) as Data.ID[]);
  }

  if (permissionsToAdd.length > 0) {
    await createApiTokenAdminPermissions(tokenId, permissionsToAdd as any);
  }

  // Return all current permissions
  const allCurrentPermissions = await getService('permission').findMany({
    where: { apiToken: { id: tokenId } },
  });

  return allCurrentPermissions;
};

/**
 * Reconcile a token's admin permissions against the owner's current effective ceiling.
 *
 * Pure / sync — no DB calls. Returns two buckets:
 *   toDelete  – permissions that are no longer within the user's scope (action/subject missing
 *               or requested fields exceed the allowed set)
 *   toUpdate  – permissions that are still in scope but whose conditions must be re-clamped
 *               to the current union of the matching user permissions' conditions
 */
const reconcileTokenPermissionsToUserCeiling = (
  userPermissions: Permission[],
  tokenPermissions: Permission[]
): { toDelete: Permission[]; toUpdate: { id: Data.ID; conditions: string[] }[] } => {
  const toDelete: Permission[] = [];
  const toUpdate: { id: Data.ID; conditions: string[] }[] = [];

  tokenPermissions.forEach((tokenPerm) => {
    const tokenSubject = tokenPerm.subject || null;

    const matchingUserPerms = userPermissions.filter(
      (userPerm) =>
        userPerm.action === tokenPerm.action && (userPerm.subject || null) === tokenSubject
    );

    if (matchingUserPerms.length === 0) {
      toDelete.push(tokenPerm);
      return;
    }

    // Field-level ceiling check (mirrors enforceAdminPermissionsCeiling)
    const anyUserPermHasAllFields = matchingUserPerms.some(
      (p) => !p.properties?.fields || p.properties.fields.length === 0
    );
    const tokenFields = tokenPerm.properties?.fields;

    const fieldCeilingExceeded =
      !anyUserPermHasAllFields &&
      tokenFields !== undefined &&
      tokenFields !== null &&
      tokenFields.length > 0 &&
      (() => {
        const effectiveUserFields = uniq(
          matchingUserPerms.flatMap((p) => p.properties?.fields || [])
        );
        return tokenFields.some((f) => !effectiveUserFields.includes(f));
      })();

    if (fieldCeilingExceeded) {
      toDelete.push(tokenPerm);
      return;
    }

    // Condition: force conditions to be the ones of the user permission(s)
    const anyUserPermIsUnconditional = matchingUserPerms.some(
      (p) => !p.conditions || p.conditions.length === 0
    );
    const enforcedConditions: string[] = anyUserPermIsUnconditional
      ? []
      : (uniq(matchingUserPerms.flatMap((p) => p.conditions || [])) as string[]);

    const currentConditions: string[] = (tokenPerm.conditions as string[]) || [];
    const conditionsChanged =
      enforcedConditions.length !== currentConditions.length ||
      enforcedConditions.some((c) => !currentConditions.includes(c));

    if (conditionsChanged) {
      toUpdate.push({ id: tokenPerm.id as Data.ID, conditions: enforcedConditions });
    }
  });

  return { toDelete, toUpdate };
};

/**
 * Re-sync all admin token permissions for a given user against their current effective ceiling.
 *
 * Skips super-admins (no ceiling). For each admin token owned by the user:
 *   - Deletes permissions that are no longer within the user's scope
 *   - Updates conditions on permissions whose conditions have drifted from the role's current set
 */
const syncApiTokenPermissionsForUser = async (userId: Data.ID): Promise<void> => {
  const user = await strapi.db.query('admin::user').findOne({
    where: { id: userId },
    populate: ['roles'],
  });

  if (user === null || user === undefined) return;
  if (isSuperAdmin(user as AdminUser)) return;

  const userEffectivePermissions: Permission[] = await getService('permission').findUserPermissions(
    user as AdminUser
  );

  const tokens = await strapi.db.query('admin::api-token').findMany({
    where: { kind: 'admin', adminUserOwner: { id: userId } },
    populate: ['adminPermissions'],
  });

  const tokensWithPermissions = tokens.filter(
    (token: { adminPermissions?: Permission[] }) =>
      Array.isArray(token.adminPermissions) && token.adminPermissions.length > 0
  );

  for (const token of tokensWithPermissions) {
    const tokenPermissions: Permission[] = token.adminPermissions as Permission[];

    const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
      userEffectivePermissions,
      tokenPermissions
    );

    if (toDelete.length > 0) {
      await getService('permission').deleteByIds(toDelete.map((p) => p.id as Data.ID));
    }

    for (const { id, conditions } of toUpdate) {
      await strapi.db.query('admin::permission').update({ where: { id }, data: { conditions } });
    }
  }
};

/**
 * Re-sync admin token permissions for all admin users who hold a given role.
 * Called after role permissions are updated.
 */
const syncApiTokenPermissionsForRole = async (roleId: Data.ID): Promise<void> => {
  const users = await strapi.db.query('admin::user').findMany({
    where: { roles: { id: roleId } },
    populate: ['roles'],
  });

  await Promise.allSettled(users.map((user) => syncApiTokenPermissionsForUser(user.id as Data.ID)));
};

/**
 * Flatten a token's database permissions objects to an array of strings
 */
const flattenTokenPermissions = (permissions: { action: string }[] | undefined): string[] => {
  return isArray(permissions) ? map('action', permissions) : [];
};

type WhereParams = {
  id?: string | number;
  name?: string;
  lastUsedAt?: number;
  description?: string;
  accessKey?: string;
  kind?: 'content-api' | 'admin';
};

type GetByOptions = {
  includeDecryptedKey?: boolean;
};

/**
 *  Get a token.
 *  By default the plaintext accessKey is NOT included.
 *  Pass { includeDecryptedKey: true } to decrypt and return it (owner-only paths).
 */
const getBy = async (
  whereParams: WhereParams = {},
  options: GetByOptions = {}
): Promise<AnyApiToken | null> => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  const { includeDecryptedKey = false } = options;

  const selectFields = includeDecryptedKey ? [...SELECT_FIELDS, 'encryptedKey'] : SELECT_FIELDS;

  const token = await strapi.db.query('admin::api-token').findOne({
    select: selectFields,
    populate: POPULATE_FIELDS,
    where: whereParams,
  });

  if (!token) {
    return token;
  }

  // Tokens created before kind introduction case: force kind to be content-api
  const computedKind = token.kind ?? 'content-api';

  const result = omit(
    ['accessKey', 'encryptedKey', 'type', 'permissions', 'adminPermissions', 'adminUserOwner'],
    token
  );

  if (computedKind === 'content-api') {
    Object.assign(result, {
      kind: 'content-api',
      type: token.type,
      permissions: flattenTokenPermissions(token.permissions),
    });
  } else if (computedKind === 'admin') {
    Object.assign(result, {
      kind: 'admin',
      adminPermissions: token.adminPermissions,
      adminUserOwner: token.adminUserOwner,
    });
  }

  if (includeDecryptedKey && token.encryptedKey) {
    Object.assign(result, { accessKey: getService('encryption').decrypt(token.encryptedKey) });
  }

  return result as AnyApiToken;
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
  const apiTokenCfg = strapi.config.get<Core.Config.Admin['apiToken']>('admin.apiToken');
  const salt = apiTokenCfg.salt;

  return crypto.createHmac('sha512', salt).update(accessKey).digest('hex');
};

const getExpirationFields = (lifespan: AnyApiToken['lifespan']) => {
  // it must be nil or a finite number >= 0
  const isValidNumber = isNumber(lifespan) && Number.isFinite(lifespan) && lifespan > 0;
  if (!isValidNumber && !isNil(lifespan)) {
    throw new ValidationError('lifespan must be a positive number or null');
  }

  return {
    lifespan: lifespan ?? null,
    expiresAt: lifespan ? Date.now() + lifespan : null,
  };
};

/**
 * Create a token and its permissions
 */
const create = async <K extends AnyApiToken['kind']>(
  attributes: { kind: K } & (ContentApiApiTokenBody | AdminTokenBody),
  callingUser?: AdminUser
): Promise<
  K extends 'content-api' ? ContentApiApiToken : K extends 'admin' ? AdminApiToken : AnyApiToken
> => {
  const encryptionService = getService('encryption');
  const accessKey = crypto.randomBytes(128).toString('hex');
  const encryptedKey = encryptionService.encrypt(accessKey);

  assertValidLifespan(attributes.lifespan);

  if (attributes.kind === 'content-api') {
    const castedContentApiApiTokenBody = attributes as ContentApiApiTokenBody;
    assertLegacyKindFields(castedContentApiApiTokenBody);
    assertCustomTokenPermissionsValidity(
      castedContentApiApiTokenBody.type,
      castedContentApiApiTokenBody.permissions
    );

    // content api tokens have no owner
    const apiToken = await strapi.db.query('admin::api-token').create({
      select: SELECT_FIELDS,
      populate: POPULATE_FIELDS,
      data: {
        ...(omit(['permissions', 'adminPermissions', 'adminUserOwner'], attributes) as object),
        accessKey: hash(accessKey),
        encryptedKey,
        adminUserOwner: null,
        ...getExpirationFields(castedContentApiApiTokenBody.lifespan ?? null),
      },
    });

    const result: ContentApiApiToken = { ...apiToken, accessKey };

    // If this is a custom type token, create the related content-API permissions
    if (castedContentApiApiTokenBody.type === constants.API_TOKEN_TYPE.CUSTOM) {
      // TODO: createMany doesn't seem to create relation properly, implement a better way rather than a ton of queries
      await Promise.all(
        uniq(castedContentApiApiTokenBody.permissions).map((action) =>
          strapi.db.query('admin::api-token-permission').create({
            data: { action, token: apiToken },
          })
        )
      );

      const currentPermissions = await strapi.db
        .query('admin::api-token')
        .load(apiToken, 'permissions');

      if (currentPermissions) {
        Object.assign(result, { permissions: flattenTokenPermissions(currentPermissions) });
      }
    }

    // Casted to any to avoid complex type duplication
    return omit(['adminPermissions', 'adminUserOwner'], result) as any;
  }

  // kind === 'admin'
  assertAdminKindFields(attributes);
  const castedAdminTokenBody = attributes as AdminTokenBody;
  await assertAdminPermissionsValidity(castedAdminTokenBody.adminPermissions);
  const clampedAdminPermissions = await enforceAdminPermissionsCeiling(
    callingUser,
    castedAdminTokenBody.adminPermissions
  );

  // Owner: when explicitly provided, it must match the caller.
  // When omitted, always defaults to the calling user (including super admins).
  let ownerId: Data.ID;
  if (
    castedAdminTokenBody.adminUserOwner !== undefined &&
    castedAdminTokenBody.adminUserOwner !== null
  ) {
    await assertOwnerMatchesCallingUser(castedAdminTokenBody.adminUserOwner, callingUser);
    ownerId = castedAdminTokenBody.adminUserOwner;
  } else {
    if (callingUser === undefined || callingUser === null) {
      throw new ValidationError('Creating an admin token requires an authenticated admin user');
    }
    ownerId = callingUser.id as Data.ID;
  }

  const apiToken = await strapi.db.query('admin::api-token').create({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    data: {
      ...(omit(['permissions', 'adminPermissions', 'adminUserOwner'], attributes) as object),
      accessKey: hash(accessKey),
      encryptedKey,
      adminUserOwner: ownerId,
      ...getExpirationFields(castedAdminTokenBody.lifespan ?? null),
    },
  });

  const result = { ...apiToken, accessKey } as AnyApiToken;

  // Handle admin permissions (using ceiling-clamped permissions with inherited conditions)
  if (clampedAdminPermissions.length > 0) {
    await createApiTokenAdminPermissions(apiToken.id, clampedAdminPermissions);

    const currentAdminPermissions = await strapi.db
      .query('admin::api-token')
      .load(apiToken, 'adminPermissions');

    if (currentAdminPermissions) {
      Object.assign(result, { adminPermissions: currentAdminPermissions });
    }
  }

  // Casted to any to avoid complex type duplication
  return omit(['permissions'], result) as any;
};

const regenerate = async (id: string | number): Promise<ContentApiApiToken | AdminApiToken> => {
  const accessKey = crypto.randomBytes(128).toString('hex');
  const encryptionService = getService('encryption');
  const encryptedKey = encryptionService.encrypt(accessKey);

  const apiToken: AnyApiToken = await strapi.db.query('admin::api-token').update({
    select: ['id', 'accessKey'],
    where: { id },
    data: {
      accessKey: hash(accessKey),
      encryptedKey,
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
  const apiTokenCfg = strapi.config.get<Core.Config.Admin['apiToken']>('admin.apiToken');
  if (!apiTokenCfg?.salt) {
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
 * Return a list of tokens visible to the calling user.
 * Super-admins see all tokens; regular admins see only ownerless tokens and their own.
 */
const list = async <K extends AnyApiToken['kind']>(
  callingUser: AdminUser,
  { filter }: { filter?: { kind?: K } } = {}
): Promise<
  Array<
    K extends 'content-api' ? ContentApiApiToken : K extends 'admin' ? AdminApiToken : AnyApiToken
  >
> => {
  const ownershipWhere = isSuperAdmin(callingUser)
    ? {}
    : { $or: [{ adminUserOwner: null }, { adminUserOwner: { id: callingUser.id } }] };

  // Tokens without a persisted kind are content-api tokens (pre-migration rows).
  let kindWhere: Record<string, unknown> = {};
  if (filter?.kind === 'content-api') {
    kindWhere = { $or: [{ kind: 'content-api' }, { kind: null }] };
  } else if (filter?.kind !== undefined) {
    kindWhere = { kind: filter.kind };
  }

  const where = { ...ownershipWhere, ...kindWhere };

  const tokens = await strapi.db.query('admin::api-token').findMany({
    select: SELECT_FIELDS,
    populate: POPULATE_FIELDS,
    orderBy: { name: 'ASC' },
    where,
  });

  if (!tokens) {
    return tokens;
  }

  return tokens.map((token) =>
    token.kind === null || token.kind === 'content-api'
      ? omit(['adminPermissions', 'adminUserOwner'], {
          ...token,
          // Tokens created before kind introduction case: force kind to be content-api
          kind: 'content-api',
          permissions: flattenTokenPermissions(token.permissions),
        })
      : (omit(['permissions'], token) as any)
  );
};

/**
 * Revoke (delete) a token
 */
const revoke = async (id: string | number): Promise<AnyApiToken> => {
  const token = await strapi.db.query('admin::api-token').findOne({
    where: { id },
    select: ['id'],
    populate: ['adminPermissions'],
  });

  if (token !== null && token !== undefined) {
    const permissionIds = ((token.adminPermissions as Array<{ id: Data.ID }>) ?? [])
      .map((p) => p.id)
      .filter((permId) => permId !== null && permId !== undefined);

    if (permissionIds.length > 0) {
      await getService('permission').deleteByIds(permissionIds);
    }
  }

  return strapi.db
    .query('admin::api-token')
    .delete({ select: SELECT_FIELDS, populate: POPULATE_FIELDS, where: { id } });
};

/**
 * Retrieve a token by id
 */
const getById = async (id: string | number, options?: GetByOptions) => {
  return getBy({ id }, options);
};

/**
 * Retrieve a token by name
 */
const getByName = async (name: string, options?: GetByOptions) => {
  return getBy({ name }, options);
};

/**
 * Update a token and its permissions
 */
const update = async (
  id: string | number,
  attributes: Update.Request['body']
): Promise<AnyApiToken> => {
  const originalToken = await strapi.db
    .query('admin::api-token')
    .findOne({ select: SELECT_FIELDS, populate: ['adminUserOwner'], where: { id } });

  if (!originalToken) {
    throw new NotFoundError('Token not found');
  }

  const raw = attributes as Record<string, unknown>;

  // kind is immutable after creation
  if (raw.kind !== undefined && raw.kind !== null && raw.kind !== originalToken.kind) {
    throw new ValidationError('kind is immutable after creation');
  }

  assertValidLifespan(attributes.lifespan);

  let clampedAdminPermissions: PermissionInput[] | undefined;
  let tokenOwnerUser: AdminUser | undefined;

  if (originalToken.kind === 'content-api') {
    assertLegacyKindFields(attributes as ContentApiApiTokenBody);

    const incomingType = raw.type as ContentApiApiToken['type'] | undefined;
    const incomingPermissions = raw.permissions as string[] | null | undefined;
    const resolvedType = incomingType ?? (originalToken.type as ContentApiApiToken['type']);
    const changingTypeToCustom =
      incomingType === constants.API_TOKEN_TYPE.CUSTOM &&
      originalToken.type !== constants.API_TOKEN_TYPE.CUSTOM;

    // Only re-validate if permissions or type are being changed
    if (incomingPermissions !== undefined || changingTypeToCustom) {
      assertCustomTokenPermissionsValidity(
        resolvedType,
        incomingPermissions ?? (originalToken.permissions as string[])
      );
    }
  } else if (originalToken.kind === 'admin') {
    assertAdminKindFields(attributes as AdminTokenBody);

    const incomingAdminPermissions = raw.adminPermissions as PermissionInput[] | undefined;
    if (incomingAdminPermissions !== undefined) {
      await assertAdminPermissionsValidity(incomingAdminPermissions);

      // Ceiling is always the owner's permissions, not the calling user's.
      // A super admin editing another user's token must not overflow that user's scope.
      const ownerId = getOwnerId(originalToken as AdminApiToken);
      const resolvedOwner = await getService('user').findOne(ownerId);
      if (resolvedOwner === null || resolvedOwner === undefined) {
        throw new ValidationError('Token owner no longer exists');
      }
      tokenOwnerUser = resolvedOwner;
      clampedAdminPermissions = await enforceAdminPermissionsCeiling(
        tokenOwnerUser,
        incomingAdminPermissions
      );
    }

    const incomingAdminUserOwner = raw.adminUserOwner;
    if (incomingAdminUserOwner !== undefined) {
      // Owner is immutable; the provided value must match the existing one
      const existingOwner = originalToken.adminUserOwner;
      const existingOwnerId =
        existingOwner === null || existingOwner === undefined
          ? null
          : String(typeof existingOwner === 'object' ? existingOwner.id : existingOwner);
      const requestedOwnerId =
        incomingAdminUserOwner === null ? null : String(incomingAdminUserOwner);

      if (requestedOwnerId !== existingOwnerId) {
        throw new ValidationError('adminUserOwner cannot be changed on update');
      }
    }
  }

  const updatedToken = await strapi.db.query('admin::api-token').update({
    select: SELECT_FIELDS,
    where: { id },
    // kind is immutable — strip it along with relation fields so the DB write is clean
    data: omit(['kind', 'permissions', 'adminPermissions', 'adminUserOwner'], attributes) as object,
  });

  if (originalToken.kind === 'content-api') {
    const incomingPermissions = raw.permissions as string[] | null | undefined;

    // custom tokens need to have their permissions updated as well
    if (
      updatedToken.type === constants.API_TOKEN_TYPE.CUSTOM &&
      incomingPermissions !== undefined
    ) {
      const currentPermissionsResult = await strapi.db
        .query('admin::api-token')
        .load(updatedToken, 'permissions');

      const currentPermissions = map('action', currentPermissionsResult || []);
      const newPermissions = uniq(incomingPermissions || []);

      const actionsToDelete = difference(currentPermissions, newPermissions);
      const actionsToAdd = difference(newPermissions, currentPermissions);

      // TODO: improve efficiency here
      await Promise.all(
        actionsToDelete.map((action) =>
          strapi.db.query('admin::api-token-permission').delete({
            where: { action, token: id },
          })
        )
      );

      // TODO: improve efficiency here
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

    const permissionsFromDb = await strapi.db
      .query('admin::api-token')
      .load(updatedToken, 'permissions');

    return {
      ...updatedToken,
      permissions: permissionsFromDb ? permissionsFromDb.map((p: any) => p.action) : undefined,
    } as AnyApiToken;
  }

  // kind === 'admin'
  if (clampedAdminPermissions !== undefined) {
    if (tokenOwnerUser === undefined) {
      throw new ValidationError('Updating admin permissions requires a resolved token owner');
    }
    await assignAdminPermissionsToToken(id, clampedAdminPermissions, tokenOwnerUser);
  }

  const adminPermissionsFromDb = await strapi.db
    .query('admin::api-token')
    .load(updatedToken, 'adminPermissions');

  const adminUserOwnerFromDb = await strapi.db
    .query('admin::api-token')
    .load(updatedToken, 'adminUserOwner');

  return {
    ...updatedToken,
    adminPermissions: adminPermissionsFromDb || [],
    adminUserOwner: adminUserOwnerFromDb,
  } as AnyApiToken;
};

const count = async (where = {}): Promise<number> => {
  return strapi.db.query('admin::api-token').count({ where });
};

/**
 * Delete all admin API tokens owned by the given user, including their associated admin permissions.
 * Called when the owner user is deleted so tokens don't linger with a dangling owner FK.
 */
const deleteAdminTokensForUser = async (userId: Data.ID): Promise<void> => {
  const tokens = await strapi.db.query('admin::api-token').findMany({
    where: { kind: 'admin', adminUserOwner: { id: userId } },
    select: ['id'],
    populate: ['adminPermissions'],
  });

  for (const token of tokens) {
    const permissionIds = ((token.adminPermissions as Array<{ id: Data.ID }>) ?? [])
      .map((p) => p.id)
      .filter((id) => id !== null && id !== undefined);

    if (permissionIds.length > 0) {
      await getService('permission').deleteByIds(permissionIds);
    }

    await strapi.db.query('admin::api-token').delete({ where: { id: token.id } });
  }
};

// -------------------------------------------------------------------------
// Service interfaces
// -------------------------------------------------------------------------

interface SharedTokenMethods {
  hash(accessKey: string): string;
  checkSaltIsDefined(): void;
  /** Kind-agnostic lookup by hashed access key — used by the auth strategy. */
  getByAccessKey(accessKeyHash: string, options?: GetByOptions): Promise<AnyApiToken | null>;
  /** Total count across all kinds. */
  countAll(where?: object): Promise<number>;
  reconcileTokenPermissionsToUserCeiling(
    userPermissions: Permission[],
    tokenPermissions: Permission[]
  ): { toDelete: Permission[]; toUpdate: { id: Data.ID; conditions: string[] }[] };
}

export interface ContentApiTokenService extends SharedTokenMethods {
  create(attributes: ContentApiApiTokenBody, callingUser?: AdminUser): Promise<ContentApiApiToken>;
  list(callingUser: AdminUser): Promise<ContentApiApiToken[]>;
  getById(id: string | number, options?: GetByOptions): Promise<ContentApiApiToken | null>;
  getByName(name: string, options?: GetByOptions): Promise<ContentApiApiToken | null>;
  update(
    id: string | number,
    attributes: Partial<ContentApiApiTokenBody>
  ): Promise<ContentApiApiToken>;
  revoke(id: string | number): Promise<ContentApiApiToken>;
  regenerate(id: string | number): Promise<ContentApiApiToken>;
  exists(where: WhereParams): Promise<boolean>;
  count(where?: object): Promise<number>;
}

export interface AdminTokenService extends SharedTokenMethods {
  create(attributes: AdminTokenBody, callingUser: AdminUser): Promise<AdminApiToken>;
  list(callingUser: AdminUser): Promise<AdminApiToken[]>;
  getById(id: string | number, options?: GetByOptions): Promise<AdminApiToken | null>;
  getByName(name: string, options?: GetByOptions): Promise<AdminApiToken | null>;
  update(id: string | number, attributes: Partial<AdminTokenBody>): Promise<AdminApiToken>;
  revoke(id: string | number): Promise<AdminApiToken>;
  regenerate(id: string | number): Promise<AdminApiToken>;
  exists(where: WhereParams): Promise<boolean>;
  count(where?: object): Promise<number>;
  assignAdminPermissionsToToken(
    tokenId: Data.ID,
    permissions: PermissionInput[],
    ceilingUser: AdminUser
  ): Promise<Permission[]>;
  syncPermissionsForUser(userId: Data.ID): Promise<void>;
  syncPermissionsForRole(roleId: Data.ID): Promise<void>;
  deleteTokensForUser(userId: Data.ID): Promise<void>;
}

// -------------------------------------------------------------------------
// Factory
// -------------------------------------------------------------------------

function createTokenService(kind: 'content-api'): ContentApiTokenService;
function createTokenService(kind: 'admin'): AdminTokenService;
function createTokenService(
  kind: 'content-api' | 'admin'
): ContentApiTokenService | AdminTokenService {
  const shared: SharedTokenMethods = {
    hash,
    checkSaltIsDefined,
    getByAccessKey: (accessKeyHash, options) => getBy({ accessKey: accessKeyHash }, options),
    countAll: count,
    reconcileTokenPermissionsToUserCeiling,
  };

  if (kind === 'content-api') {
    const svc: ContentApiTokenService = {
      ...shared,
      create: (attributes: ContentApiApiTokenBody, callingUser?: AdminUser) =>
        create({ ...attributes, kind: 'content-api' }, callingUser) as Promise<ContentApiApiToken>,
      list: (callingUser: AdminUser) =>
        list(callingUser, { filter: { kind: 'content-api' } }) as Promise<ContentApiApiToken[]>,
      getById: (id: string | number, options?: GetByOptions) =>
        getBy({ id, kind: 'content-api' }, options) as Promise<ContentApiApiToken | null>,
      getByName: (name: string, options?: GetByOptions) =>
        getBy({ name, kind: 'content-api' }, options) as Promise<ContentApiApiToken | null>,
      update: (id: string | number, attributes: Partial<ContentApiApiTokenBody>) =>
        update(id, attributes) as Promise<ContentApiApiToken>,
      revoke: (id: string | number) => revoke(id) as Promise<ContentApiApiToken>,
      regenerate: (id: string | number) => regenerate(id) as Promise<ContentApiApiToken>,
      exists,
      count,
    };
    return svc;
  }

  const svc: AdminTokenService = {
    ...shared,
    create: (attributes: AdminTokenBody, callingUser: AdminUser) =>
      create({ ...attributes, kind: 'admin' }, callingUser) as Promise<AdminApiToken>,
    list: (callingUser: AdminUser) =>
      list(callingUser, { filter: { kind: 'admin' } }) as Promise<AdminApiToken[]>,
    getById: (id: string | number, options?: GetByOptions) =>
      getBy({ id, kind: 'admin' }, options) as Promise<AdminApiToken | null>,
    getByName: (name: string, options?: GetByOptions) =>
      getBy({ name, kind: 'admin' }, options) as Promise<AdminApiToken | null>,
    update: (id: string | number, attributes: Partial<AdminTokenBody>) =>
      update(id, attributes) as Promise<AdminApiToken>,
    revoke: (id: string | number) => revoke(id) as Promise<AdminApiToken>,
    regenerate: (id: string | number) => regenerate(id) as Promise<AdminApiToken>,
    exists,
    count,
    assignAdminPermissionsToToken,
    syncPermissionsForUser: syncApiTokenPermissionsForUser,
    syncPermissionsForRole: syncApiTokenPermissionsForRole,
    deleteTokensForUser: deleteAdminTokensForUser,
  };
  return svc;
}

export type { GetByOptions };

export {
  createTokenService,
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
  assignAdminPermissionsToToken,
  enforceAdminPermissionsCeiling,
  reconcileTokenPermissionsToUserCeiling,
  syncApiTokenPermissionsForUser,
  syncApiTokenPermissionsForRole,
  deleteAdminTokensForUser,
};
