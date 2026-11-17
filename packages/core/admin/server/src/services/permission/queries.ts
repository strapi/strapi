import { get, xor, differenceWith } from 'lodash';

import pmap from 'p-map';
import type { Data } from '@strapi/types';
import { quoteForLog } from '@strapi/utils';
import { getService } from '../../utils';
import permissionDomain, { CreatePermissionPayload } from '../../domain/permission';
import type { AdminUser, Permission } from '../../../../shared/contracts/shared';
import { Action } from '../../domain/action';

/**
 * Delete permissions of roles in database
 * @param rolesIds ids of roles
 */
export const deleteByRolesIds = async (rolesIds: Data.ID[]): Promise<void> => {
  const permissionsToDelete = await strapi.db.query('admin::permission').findMany({
    select: ['id'],
    where: {
      role: { id: rolesIds },
    },
  });

  if (permissionsToDelete.length > 0) {
    await deleteByIds(permissionsToDelete.map((permission) => permission?.id));
  }
};

/**
 * Delete permissions
 * @param ids ids of permissions
 */
export const deleteByIds = async (ids: Data.ID[]): Promise<void> => {
  const result: unknown[] = [];
  for (const id of ids) {
    const queryResult = await strapi.db.query('admin::permission').delete({ where: { id } });
    result.push(queryResult);
  }
  strapi.eventHub.emit('permission.delete', { permissions: result });
};

/**
 * Create many permissions
 * @param permissions
 */
export const createMany = async (permissions: CreatePermissionPayload[]): Promise<Permission[]> => {
  const createdPermissions: CreatePermissionPayload[] = [];
  for (const permission of permissions) {
    const newPerm = await strapi.db.query('admin::permission').create({ data: permission });
    createdPermissions.push(newPerm);
  }

  const permissionsToReturn = permissionDomain.toPermission(createdPermissions);
  strapi.eventHub.emit('permission.create', { permissions: permissionsToReturn });

  return permissionsToReturn;
};

/**
 * Update a permission
 * @param params
 * @param attributes
 */
const update = async (params: unknown, attributes: Partial<Permission>) => {
  const updatedPermission = (await strapi.db
    .query('admin::permission')
    .update({ where: params, data: attributes })) as Permission;

  const permissionToReturn = permissionDomain.toPermission(updatedPermission);
  strapi.eventHub.emit('permission.update', { permissions: permissionToReturn });

  return permissionToReturn;
};

/**
 * Find assigned permissions in the database
 * @param params query params to find the permissions
 */
export const findMany = async (params = {}): Promise<Permission[]> => {
  const rawPermissions = await strapi.db.query('admin::permission').findMany(params);

  return permissionDomain.toPermission(rawPermissions);
};

/**
 * Find all permissions for a user
 * @param user - user
 */
export const findUserPermissions = async (user: AdminUser): Promise<Permission[]> => {
  return findMany({ where: { role: { users: { id: user.id } } } });
};

const isNil = (value: unknown) => value === undefined || value === null;

type ApplicableProperty = { property: string; applies: boolean; value: unknown };

/**
 * Whether each property the action lists is applicable and missing on the stored permission.
 * A `null` or `undefined` property is missing, with one exception: `locales: null` grants every
 * locale (i18n), so it counts as set as long as no other applicable property is missing.
 */
const findMissingProperties = (properties: ApplicableProperty[]) => {
  const hasOtherMissingProperty = properties.some(
    ({ property, applies, value }) => applies === true && property !== 'locales' && isNil(value)
  );

  return properties.map(({ property, applies, value }) => {
    if (applies === false) {
      return false;
    }

    if (property === 'locales' && value === null) {
      return hasOtherMissingProperty;
    }

    return isNil(value);
  });
};

const filterPermissionsToRemove = async (permissions: Permission[]) => {
  const { actionProvider } = getService('permission');

  const permissionsToRemove: Permission[] = [];

  for (const permission of permissions) {
    const { subjects, options = {} as Action['options'] } =
      (actionProvider.get(permission.action) as Action) || {};
    const { applyToProperties } = options;

    const properties = await Promise.all(
      (applyToProperties || []).map(async (property) => ({
        property,
        applies: await actionProvider.appliesToProperty(
          property,
          permission.action,
          permission.subject
        ),
        value: permissionDomain.getProperty(property, permission) as unknown,
      }))
    );
    const invalidProperties = findMissingProperties(properties);

    const isRegisteredAction = actionProvider.has(permission.action);
    const hasInvalidProperties =
      Array.isArray(applyToProperties) && invalidProperties.every((result) => result === true);
    const isInvalidSubject =
      Array.isArray(subjects) && !subjects.includes(permission.subject as string);
    // On an api token permission, nil properties mean "everything", not "invalid"
    const hasApiToken = get(permission, 'apiToken') != null;

    // If the permission has an invalid action, an invalid subject or invalid properties, then add it to the toBeRemoved collection
    if (!isRegisteredAction || isInvalidSubject || (hasInvalidProperties && !hasApiToken)) {
      permissionsToRemove.push(permission);
    }
  }

  return permissionsToRemove;
};

type PermissionOwner = { id: Data.ID; name?: string };

const formatOwners = (owners: PermissionOwner[]) => {
  const uniqueOwners = Array.from(new Map(owners.map((owner) => [owner.id, owner])).values());

  if (uniqueOwners.length === 0) {
    return 'none';
  }

  return uniqueOwners.map((owner) => `${quoteForLog(owner.name)} (id ${owner.id})`).join(', ');
};

/**
 * Warns about the stored permissions the boot cleanup deleted, so a lost grant leaves a trace
 */
const logRemovedPermissions = (removedPermissions: Permission[]) => {
  if (removedPermissions.length === 0) {
    return;
  }

  const ownerOf = (permission: Permission, key: 'role' | 'apiToken') =>
    get(permission, key) as PermissionOwner | null | undefined;

  const actions = Array.from(new Set(removedPermissions.map((permission) => permission.action)));
  const subjects = Array.from(
    new Set(
      removedPermissions
        .map((permission) => permission.subject)
        .filter((subject): subject is string => typeof subject === 'string')
    )
  );
  const roles = removedPermissions
    .map((permission) => ownerOf(permission, 'role'))
    .filter((owner): owner is PermissionOwner => owner != null);
  const tokens = removedPermissions
    .map((permission) => ownerOf(permission, 'apiToken'))
    .filter((owner): owner is PermissionOwner => owner != null);
  const withoutOwnerCount = removedPermissions.filter(
    (permission) => ownerOf(permission, 'role') == null && ownerOf(permission, 'apiToken') == null
  ).length;

  strapi.log.warn(
    `Removed ${removedPermissions.length} stored admin permission(s) that no longer match a registered action, a valid subject or valid properties, or have no owner. ` +
      `Actions: ${actions.map(quoteForLog).join(', ')}. ` +
      `Subjects: ${subjects.length === 0 ? 'none' : subjects.map(quoteForLog).join(', ')}. ` +
      `Roles: ${formatOwners(roles)}. ` +
      `Admin tokens: ${formatOwners(tokens)}. ` +
      `Without role or admin token: ${withoutOwnerCount}.`
  );
};

/**
 * Removes permissions in database that don't exist anymore
 */
export const cleanPermissionsInDatabase = async (): Promise<void> => {
  const pageSize = 200;
  const removedPermissions: Permission[] = [];

  const contentTypeService = getService('content-type');

  // Pages by id, not by offset: each page deletes rows, which would shift the next offset past unread rows
  let lastId: Data.ID | undefined;

  for (;;) {
    // 1. Find invalid permissions and collect their ID to delete them later
    const results = (await strapi.db.query('admin::permission').findMany({
      where: lastId === undefined ? {} : { id: { $gt: lastId } },
      orderBy: { id: 'asc' },
      limit: pageSize,
      populate: ['role', 'apiToken'],
    })) as Permission[];

    if (results.length === 0) {
      break;
    }

    lastId = results[results.length - 1].id;

    const permissions = permissionDomain.toPermission(results);
    const permissionsToRemove = await filterPermissionsToRemove(permissions);

    // Also remove orphaned permissions (no role AND no apiToken)
    const orphanedPermissions = permissions.filter(
      (permission: any) => !permission.role && !permission.apiToken
    );

    const permissionsIdToRemove = Array.from(
      new Set([...permissionsToRemove, ...orphanedPermissions].map((p) => p.id))
    );

    removedPermissions.push(
      ...permissions.filter((permission) => permissionsIdToRemove.includes(permission.id))
    );

    // 2. Clean permissions' fields (add required ones, remove the non-existing ones)
    const remainingPermissions = permissions.filter(
      (permission: Permission) => !permissionsIdToRemove.includes(permission.id)
    );

    const permissionsWithCleanFields = contentTypeService.cleanPermissionFields(
      remainingPermissions
    ) as Permission[];

    // Update only the ones that need to be updated
    const permissionsNeedingToBeUpdated = differenceWith(
      permissionsWithCleanFields,
      remainingPermissions,
      (a: Permission, b: Permission) => {
        return a.id === b.id && xor(b.properties.fields, a.properties.fields).length === 0;
      }
    );

    const updatePromiseProvider = (permission: Permission) => {
      return update({ id: permission.id }, permission);
    };

    // Execute all the queries, update the database
    await Promise.all([
      deleteByIds(permissionsIdToRemove),
      pmap(permissionsNeedingToBeUpdated, updatePromiseProvider, {
        concurrency: 100,
        stopOnError: true,
      }),
    ]);

    if (results.length < pageSize) {
      break;
    }
  }

  logRemovedPermissions(removedPermissions);
};

export default {
  createMany,
  findMany,
  deleteByRolesIds,
  deleteByIds,
  findUserPermissions,
  cleanPermissionsInDatabase,
};
