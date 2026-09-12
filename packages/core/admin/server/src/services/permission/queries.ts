import { isNil, isArray, prop, xor, eq, differenceWith } from 'lodash/fp';
import pmap from 'p-map';
import type { Data } from '@strapi/types';
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
    await deleteByIds(permissionsToDelete.map(prop('id')));
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
 * Narrows which of a user's roles apply to the request being served.
 *
 * Returns the ids of the roles that count right now, or `null` to keep the
 * default (every role the user holds). An empty array means the user holds no
 * applicable role and therefore no permission at all.
 *
 * A user's roles are not always all of them: a deployment may scope a role
 * assignment to part of the project, so that being an editor in one place does
 * not carry over to another. This is where such a deployment says so — once,
 * before the ability is built, rather than by filtering the ability afterwards.
 */
export type UserRolesScope = (user: AdminUser) => Promise<Data.ID[] | null> | Data.ID[] | null;

let userRolesScope: UserRolesScope | null = null;

/**
 * Installs the scope described by {@link UserRolesScope}, replacing any scope
 * already installed. Returns a function that removes it again.
 */
export const setUserRolesScope = (scope: UserRolesScope | null) => {
  userRolesScope = scope;

  return () => {
    if (userRolesScope === scope) {
      userRolesScope = null;
    }
  };
};

export interface FindUserPermissionsOptions {
  /**
   * Whether the installed {@link UserRolesScope} applies.
   *
   * It should, for anything deciding what a caller may do right now. It should
   * not for anything reasoning about a user's authority in general — the
   * ceiling an admin token is clamped to, for instance, which is about the user
   * rather than about the request that happens to be running.
   */
  scoped?: boolean;
}

/**
 * Find all permissions for a user
 * @param user - user
 */
export const findUserPermissions = async (
  user: AdminUser,
  { scoped = true }: FindUserPermissionsOptions = {}
): Promise<Permission[]> => {
  const roleIds = scoped && userRolesScope ? await userRolesScope(user) : null;

  if (roleIds === null) {
    return findMany({ where: { role: { users: { id: user.id } } } });
  }

  if (roleIds.length === 0) {
    return [];
  }

  return findMany({ where: { role: { id: { $in: roleIds } } } });
};

const filterPermissionsToRemove = async (permissions: Permission[]) => {
  const { actionProvider } = getService('permission');

  const permissionsToRemove: Permission[] = [];

  for (const permission of permissions) {
    const { subjects, options = {} as Action['options'] } =
      (actionProvider.get(permission.action) as Action) || {};
    const { applyToProperties } = options;

    const invalidProperties = await Promise.all(
      (applyToProperties || []).map(async (property) => {
        const applies = await actionProvider.appliesToProperty(
          property,
          permission.action,
          permission.subject
        );

        return applies && isNil(permissionDomain.getProperty(property, permission));
      })
    );

    const isRegisteredAction = actionProvider.has(permission.action);
    const hasInvalidProperties = isArray(applyToProperties) && invalidProperties.every(eq(true));
    const isInvalidSubject = isArray(subjects) && !subjects.includes(permission.subject as string);
    // On an api token permission, nil properties mean "everything", not "invalid"
    const hasApiToken = !isNil(prop('apiToken', permission));

    // If the permission has an invalid action, an invalid subject or invalid properties, then add it to the toBeRemoved collection
    if (!isRegisteredAction || isInvalidSubject || (hasInvalidProperties && !hasApiToken)) {
      permissionsToRemove.push(permission);
    }
  }

  return permissionsToRemove;
};

/**
 * Removes permissions in database that don't exist anymore
 */
export const cleanPermissionsInDatabase = async (): Promise<void> => {
  const pageSize = 200;

  const contentTypeService = getService('content-type');

  const total = await strapi.db.query('admin::permission').count();
  const pageCount = Math.ceil(total / pageSize);

  for (let page = 0; page < pageCount; page += 1) {
    // 1. Find invalid permissions and collect their ID to delete them later
    const results = (await strapi.db.query('admin::permission').findMany({
      limit: pageSize,
      offset: page * pageSize,
      populate: ['role', 'apiToken'],
    })) as Permission[];

    const permissions = permissionDomain.toPermission(results);
    const permissionsToRemove = await filterPermissionsToRemove(permissions);

    // Also remove orphaned permissions (no role AND no apiToken)
    const orphanedPermissions = permissions.filter(
      (permission: any) => !permission.role && !permission.apiToken
    );

    const permissionsIdToRemove = Array.from(
      new Set([...permissionsToRemove, ...orphanedPermissions].map((p) => p.id))
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
      (a: Permission, b: Permission) => {
        return a.id === b.id && xor(a.properties.fields, b.properties.fields).length === 0;
      },
      permissionsWithCleanFields,
      remainingPermissions
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
  }
};

export default {
  createMany,
  findMany,
  deleteByRolesIds,
  deleteByIds,
  findUserPermissions,
  setUserRolesScope,
  cleanPermissionsInDatabase,
};
