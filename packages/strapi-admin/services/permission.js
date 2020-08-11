'use strict';

const _ = require('lodash');
const pmap = require('p-map');
const { createPermission } = require('../domain/permission');
const { validatePermissionsExist } = require('../validation/permission');
const createPermissionsManager = require('./permission/permissions-manager');
const createConditionProvider = require('./permission/condition-provider');
const createPermissionEngine = require('./permission/engine');
const actionProvider = require('./permission/action-provider');

const conditionProvider = createConditionProvider();
const engine = createPermissionEngine(conditionProvider);

const fieldsToCompare = ['action', 'subject', 'fields', 'conditions'];
const getPermissionWithSortedFields = perm => {
  const sortedPerm = _.cloneDeep(perm);
  if (Array.isArray(sortedPerm.fields)) {
    sortedPerm.fields.sort();
  }
  return sortedPerm;
};
const arePermissionsEqual = (perm1, perm2) =>
  _.isEqual(
    _.pick(getPermissionWithSortedFields(perm1), fieldsToCompare),
    _.pick(getPermissionWithSortedFields(perm2), fieldsToCompare)
  );

/**
 * Removes unwanted fields from a permission
 * @param perm
 * @returns {*}
 */
const sanitizePermission = perm => ({
  ..._.pick(perm, ['id', 'action', 'subject', 'fields']),
  conditions: strapi.admin.services.condition.removeUnkownConditionIds(perm.conditions),
});

/**
 * Delete permissions of roles in database
 * @param rolesIds ids of roles
 * @returns {Promise<array>}
 */
const deleteByRolesIds = rolesIds => {
  return strapi.query('permission', 'admin').delete({ role_in: rolesIds });
};

/**
 * Delete permissions
 * @param ids ids of permissions
 * @returns {Promise<array>}
 */
const deleteByIds = ids => {
  return strapi.query('permission', 'admin').delete({ id_in: ids });
};

/**
 * Find assigned permissions in the database
 * @param params query params to find the permissions
 * @returns {Promise<array<Object>>}
 */
const find = (params = {}) => {
  return strapi.query('permission', 'admin').find(params, []);
};

/**
 * Assign permissions to a role
 * @param {string|int} roleId - role ID
 * @param {Array<Permission{action,subject,fields,conditions}>} permissions - permissions to assign to the role
 */
const assign = async (roleId, permissions = []) => {
  try {
    await validatePermissionsExist(permissions);
  } catch (err) {
    throw strapi.errors.badRequest('ValidationError', err);
  }

  const permissionsWithRole = permissions.map(permission =>
    createPermission({
      ...permission,
      conditions: strapi.admin.services.condition.removeUnkownConditionIds(permission.conditions),
      role: roleId,
    })
  );

  const existingPermissions = await find({ role: roleId, _limit: -1 });
  const permissionsToAdd = _.differenceWith(
    permissionsWithRole,
    existingPermissions,
    arePermissionsEqual
  );
  const permissionsToDelete = _.differenceWith(
    existingPermissions,
    permissionsWithRole,
    arePermissionsEqual
  );
  const permissionsToReturn = _.differenceBy(existingPermissions, permissionsToDelete, 'id');

  if (permissionsToDelete.length > 0) {
    await deleteByIds(permissionsToDelete.map(p => p.id));
  }
  if (permissionsToAdd.length > 0) {
    const createdPermissions = await strapi
      .query('permission', 'admin')
      .createMany(permissionsToAdd);
    permissionsToReturn.push(...createdPermissions.map(p => ({ ...p, role: p.role.id })));
  }

  return permissionsToReturn;
};

/**
 * Find all permissions for a user
 * @param roles
 * @returns {Promise<*[]|*>}
 */
const findUserPermissions = async ({ roles }) => {
  if (!_.isArray(roles)) {
    return [];
  }

  return strapi
    .query('permission', 'admin')
    .find({ role_in: roles.map(_.property('id')), _limit: -1 });
};

/**
 * Removes permissions in database that don't exist anymore
 * @returns {Promise<>}
 */
const cleanPermissionInDatabase = async () => {
  const pageSize = 200;
  let page = 0;
  let total = 1;

  while (page * pageSize < total) {
    // First, delete permission that don't exist anymore
    page += 1;
    const res = await strapi.query('permission', 'admin').findPage({ page, pageSize }, []);
    total = res.pagination.total;

    const dbPermissions = res.results;
    const allActionsMap = actionProvider.getAllByMap();
    const permissionsToRemoveIds = dbPermissions.reduce((idsToDelete, perm) => {
      if (
        !allActionsMap.has(perm.action) ||
        (Array.isArray(allActionsMap.get(perm.action).subjects) &&
          !allActionsMap.get(perm.action).subjects.includes(perm.subject))
      ) {
        idsToDelete.push(perm.id);
      }
      return idsToDelete;
    }, []);

    const deletePromise = deleteByIds(permissionsToRemoveIds);

    // Second, clean fields of permissions (add required ones, remove the non-existing anymore ones)
    const permissionsInDb = dbPermissions.filter(perm => !permissionsToRemoveIds.includes(perm.id));
    const permissionsWithCleanFields = strapi.admin.services['content-type'].cleanPermissionFields(
      permissionsInDb
    );

    // Update only the ones that need to be updated
    const permissionsNeedingToBeUpdated = _.differenceWith(
      permissionsWithCleanFields,
      permissionsInDb,
      (a, b) => a.id === b.id && _.xor(a.fields, b.fields).length === 0
    );
    const promiseProvider = perm =>
      strapi.query('permission', 'admin').update({ id: perm.id }, perm);

    //Update the database
    await Promise.all([
      deletePromise,
      pmap(permissionsNeedingToBeUpdated, promiseProvider, {
        concurrency: 100,
        stopOnError: true,
      }),
    ]);
  }
};

/**
 * Reset super admin permissions (giving it all permissions)
 * @returns {Promise<>}
 */
const resetSuperAdminPermissions = async () => {
  const superAdminRole = await strapi.admin.services.role.getSuperAdmin();
  if (!superAdminRole) {
    return;
  }

  const allActions = strapi.admin.services.permission.actionProvider.getAll();
  const contentTypesActions = allActions.filter(a => a.section === 'contentTypes');

  const permissions = strapi.admin.services['content-type'].getPermissionsWithNestedFields(
    contentTypesActions
  );

  const otherActions = allActions.filter(a => a.section !== 'contentTypes');
  otherActions.forEach(action => {
    if (action.subjects) {
      const newPerms = action.subjects.map(subject =>
        createPermission({ action: action.actionId, subject })
      );
      permissions.push(...newPerms);
    } else {
      permissions.push(createPermission({ action: action.actionId }));
    }
  });

  await assign(superAdminRole.id, permissions);
};

module.exports = {
  find,
  deleteByRolesIds,
  deleteByIds,
  assign,
  sanitizePermission,
  findUserPermissions,
  actionProvider,
  createPermissionsManager,
  engine,
  conditionProvider,
  cleanPermissionInDatabase,
  resetSuperAdminPermissions,
};
