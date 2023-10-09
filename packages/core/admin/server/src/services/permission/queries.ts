import { isNil, isArray, prop, xor, eq, map, differenceWith } from 'lodash/fp';
import pmap from 'p-map';
import { getService } from '../../utils';
import permissionDomain from '../../domain/permission/index';

type ID = string | number;
/**
 * Delete permissions of roles in database
 * @param rolesIds ids of roles
 * @returns {Promise<array>}
 */
export const deleteByRolesIds = async (rolesIds: ID[]) => {
  const permissionsToDelete = await strapi.query('admin::permission').findMany({
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
 * @returns {Promise<array>}
 */
export const deleteByIds = async (ids: ID[]) => {
  const result = [];
  for (const id of ids) {
    const queryResult = await strapi.query('admin::permission').delete({ where: { id } });
    result.push(queryResult);
  }
  strapi.eventHub.emit('permission.delete', { permissions: result });
};

/**
 * Create many permissions
 * @param permissions
 * @returns {Promise<*[]|*>}
 */
export const createMany = async (permissions: any) => {
  const createdPermissions = [];
  for (const permission of permissions) {
    const newPerm = await strapi.query('admin::permission').create({ data: permission });
    createdPermissions.push(newPerm);
  }

  const permissionsToReturn = permissionDomain.toPermission(createdPermissions);
  strapi.eventHub.emit('permission.create', { permissions: permissionsToReturn });

  return permissionsToReturn;
};

/**
 * Update a permission
 * @returns {Promise<*[]|*>}
 * @param params
 * @param attributes
 */
const update = async (params: any, attributes: any) => {
  const updatedPermission = await strapi
    .query('admin::permission')
    .update({ where: params, data: attributes });

  const permissionToReturn = permissionDomain.toPermission(updatedPermission);
  strapi.eventHub.emit('permission.update', { permissions: permissionToReturn });

  return permissionToReturn;
};

/**
 * Find assigned permissions in the database
 * @param params query params to find the permissions
 * @returns {Promise<Permission[]>}
 */
export const findMany = async (params = {}) => {
  const rawPermissions = await strapi.query('admin::permission').findMany(params);

  return permissionDomain.toPermission(rawPermissions);
};

/**
 * Find all permissions for a user
 * @param user - user
 * @returns {Promise<Permission[]>}
 */
export const findUserPermissions = async (user: any) => {
  return findMany({ where: { role: { users: { id: user.id } } } });
};

const filterPermissionsToRemove = async (permissions: any) => {
  const { actionProvider } = getService('permission');

  const permissionsToRemove = [];

  for (const permission of permissions) {
    const { subjects, options = {} } = actionProvider.get(permission.action) || {};
    const { applyToProperties } = options as any;

    const invalidProperties = await Promise.all(
      (applyToProperties || []).map(async (property: any) => {
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
    const isInvalidSubject = isArray(subjects) && !subjects.includes(permission.subject);

    // If the permission has an invalid action, an invalid subject or invalid properties, then add it to the toBeRemoved collection
    if (!isRegisteredAction || isInvalidSubject || hasInvalidProperties) {
      permissionsToRemove.push(permission);
    }
  }

  return permissionsToRemove;
};

/**
 * Removes permissions in database that don't exist anymore
 * @returns {Promise<>}
 */
export const cleanPermissionsInDatabase = async () => {
  const pageSize = 200;

  const contentTypeService = getService('content-type');

  const total = await strapi.query('admin::permission').count();
  const pageCount = Math.ceil(total / pageSize);

  for (let page = 0; page < pageCount; page += 1) {
    // 1. Find invalid permissions and collect their ID to delete them later
    const results = await strapi
      .query('admin::permission')
      .findMany({ limit: pageSize, offset: page * pageSize });

    const permissions = permissionDomain.toPermission(results);
    const permissionsToRemove = await filterPermissionsToRemove(permissions);
    const permissionsIdToRemove = map(prop('id'), permissionsToRemove);

    // 2. Clean permissions' fields (add required ones, remove the non-existing ones)
    // @ts-expect-error - Make toPermission return an array if the input was an array
    const remainingPermissions = permissions.filter(
      (permission: any) => !permissionsIdToRemove.includes(permission.id)
    );

    const permissionsWithCleanFields =
      contentTypeService.cleanPermissionFields(remainingPermissions);

    // Update only the ones that need to be updated
    const permissionsNeedingToBeUpdated = differenceWith(
      (a: any, b: any) => {
        return a.id === b.id && xor(a.properties.fields, b.properties.fields).length === 0;
      },
      permissionsWithCleanFields,
      remainingPermissions
    );

    const updatePromiseProvider = (permission: any) => {
      return update({ id: permission.id }, permission);
    };

    // Execute all the queries, update the database
    await Promise.all([
      deleteByIds(permissionsIdToRemove),
      // @ts-ignore
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
