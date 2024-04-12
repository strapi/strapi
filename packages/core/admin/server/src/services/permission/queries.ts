import { isNil, isArray, prop, xor, eq, map, differenceWith } from 'lodash/fp';
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
 * Find all permissions for a user
 * @param user - user
 */
export const findUserPermissions = async (user: AdminUser): Promise<Permission[]> => {
  return findMany({ where: { role: { users: { id: user.id } } } });
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

    // If the permission has an invalid action, an invalid subject or invalid properties, then add it to the toBeRemoved collection
    if (!isRegisteredAction || isInvalidSubject || hasInvalidProperties) {
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
    const results = (await strapi.db
      .query('admin::permission')
      .findMany({ limit: pageSize, offset: page * pageSize })) as Permission[];

    const permissions = permissionDomain.toPermission(results);
    const permissionsToRemove = await filterPermissionsToRemove(permissions);
    const permissionsIdToRemove = map(prop('id'), permissionsToRemove);

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
  cleanPermissionsInDatabase,
};
