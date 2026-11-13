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

/**
 * The reason the boot cleanup removes a stored permission, or `undefined` when it keeps it
 */
const findRemovalReason = async (permission: Permission): Promise<string | undefined> => {
  const { actionProvider } = getService('permission');

  if (actionProvider.has(permission.action) === false) {
    return 'unregistered action';
  }

  const { subjects, options = {} as Action['options'] } = actionProvider.get(
    permission.action
  ) as Action;

  if (Array.isArray(subjects) && subjects.includes(permission.subject as string) === false) {
    return 'subject not handled';
  }

  const { applyToProperties } = options;

  if (Array.isArray(applyToProperties) === false) {
    return undefined;
  }

  // The properties that apply to the permission and that it does not set
  const missingProperties = await Promise.all(
    applyToProperties.map(async (property) => {
      const applies = await actionProvider.appliesToProperty(
        property,
        permission.action,
        permission.subject
      );

      // Only a missing property is invalid: `null` is a stored value (`locales: null` is every locale)
      return applies && permissionDomain.getProperty(property, permission) === undefined
        ? property
        : undefined;
    })
  );

  // On an api token permission, nil properties mean "everything", not "invalid"
  const hasApiToken = get(permission, 'apiToken') != null;

  // A permission is invalid when it misses every property of its action
  if (missingProperties.every((property) => property !== undefined) && hasApiToken === false) {
    return missingProperties.length === 0
      ? 'missing properties'
      : `missing properties (${missingProperties.join(', ')})`;
  }

  return undefined;
};

type RemovedPermission = { permission: Permission; reason: string };

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
const logRemovedPermissions = (removed: RemovedPermission[]) => {
  if (removed.length === 0) {
    return;
  }

  const removedPermissions = removed.map(({ permission }) => permission);

  const reasonCounts = new Map<string, number>();
  removed.forEach(({ reason }) => reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1));
  const reasons = Array.from(reasonCounts, ([reason, count]) => `${reason}: ${count}`);

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
      `Reasons: ${reasons.join(', ')}. ` +
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
  const removedPermissions: RemovedPermission[] = [];

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

    // Find invalid permissions, and orphaned ones (no role AND no apiToken)
    const pageRemovedPermissions: RemovedPermission[] = [];
    for (const permission of permissions) {
      const isOrphaned = get(permission, 'role') == null && get(permission, 'apiToken') == null;
      const reason = (await findRemovalReason(permission)) ?? (isOrphaned ? 'no owner' : undefined);

      if (reason !== undefined) {
        pageRemovedPermissions.push({ permission, reason });
      }
    }

    removedPermissions.push(...pageRemovedPermissions);

    const permissionsIdToRemove = pageRemovedPermissions.map(({ permission }) => permission.id);

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
