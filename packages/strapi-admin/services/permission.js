'use strict';

const _ = require('lodash');
const { flatMap, reject, isNil, isArray, xor, uniq, map, difference, flow } = require('lodash/fp');
const pmap = require('p-map');
const { getBoundActionsBySubject, BOUND_ACTIONS_FOR_FIELDS } = require('../domain/role');
const { Permission, createPermission, toPermission } = require('../domain/permission');
const { getService } = require('../utils');
const createPermissionsManager = require('./permission/permissions-manager');
const createConditionProvider = require('./permission/condition-provider');
const createPermissionEngine = require('./permission/engine');
const actionProvider = require('./permission/action-provider');
const { EDITOR_CODE } = require('./constants');

const conditionProvider = createConditionProvider();
const engine = createPermissionEngine(conditionProvider);

/**
 * Removes unwanted attributes from a permission and remove invalid items
 * @param {object|Permission} permission
 * @return {object}
 */
const sanitizePermission = permission => {
  if (permission instanceof Permission) {
    return permission.sanitizedRaw;
  }

  return createPermission(permission).sanitizedRaw;
};

/**
 * Delete permissions of roles in database
 * @param rolesIds ids of roles
 * @returns {Promise<array>}
 */
const deleteByRolesIds = async rolesIds => {
  const deletedPermissions = await strapi
    .query('permission', 'admin')
    .delete({ role_in: rolesIds });

  return toPermission(deletedPermissions);
};

/**
 * Delete permissions
 * @param ids ids of permissions
 * @returns {Promise<array>}
 */
const deleteByIds = async ids => {
  const deletedPermissions = await strapi.query('permission', 'admin').delete({ id_in: ids });

  return toPermission(deletedPermissions);
};

/**
 * Create many permissions
 * @param permissions
 * @returns {Promise<*[]|*>}
 */
const createMany = async permissions => {
  const createdPermissions = await strapi.query('permission', 'admin').createMany(permissions);

  return toPermission(createdPermissions);
};

/**
 * Update a permission
 * @returns {Promise<*[]|*>}
 * @param params
 * @param attributes
 */
const update = async (params, attributes) => {
  const updatedPermissions = await strapi.query('permission', 'admin').update(params, attributes);

  return toPermission(updatedPermissions);
};

/**
 * Find assigned permissions in the database
 * @param params query params to find the permissions
 * @returns {Promise<Permission[]>}
 */
const find = async (params = {}) => {
  const rawPermissions = await strapi.query('permission', 'admin').find(params, []);

  return toPermission(rawPermissions);
};

/**
 * Find all permissions for a user
 * @param roles
 * @returns {Promise<Permission[]>}
 */
const findUserPermissions = async ({ roles }) => {
  if (!_.isArray(roles)) {
    return [];
  }

  return find({ role_in: roles.map(_.property('id')), _limit: -1 });
};

/**
 * Removes permissions in database that don't exist anymore
 * @returns {Promise<>}
 */
const cleanPermissionInDatabase = async () => {
  const pageSize = 200;
  let total = 1;

  for (let page = 1; page * pageSize < total; page++) {
    // 1. Find invalid permissions and collect their ID to delete them later
    const { pagination, results } = await strapi
      .query('permission', 'admin')
      .findPage({ page, pageSize }, []);

    total = pagination.total;

    const permissions = toPermission(results);
    const actionsMap = actionProvider.getAllByMap();

    const permissionsIdToRemove = permissions.reduce((ids, permission) => {
      const isRegisteredAction = actionsMap.has(permission.action);

      const { subjects } = actionsMap.get(permission.action) || {};
      const isInvalidSubject = isArray(subjects) && !subjects.includes(permission.subject);

      // If the permission has an invalid action or an invalid subject, then add it to the toBeRemoved collection
      if (!isRegisteredAction || isInvalidSubject) {
        ids.push(permission.raw.id);
      }

      return ids;
    }, []);

    // 2. Clean permissions' fields (add required ones, remove the non-existing ones)
    const remainingPermissions = permissions.filter(
      permission => !permissionsIdToRemove.includes(permission.raw.id)
    );
    const permissionsWithCleanFields = getService('content-type').cleanPermissionFields(
      remainingPermissions
    );

    // Update only the ones that need to be updated
    const permissionsNeedingToBeUpdated = _.differenceWith(
      permissionsWithCleanFields,
      remainingPermissions,
      (a, b) => {
        return a.raw.id === b.raw.id && xor(a.properties.fields, b.properties.fields).length === 0;
      }
    );

    const updatePromiseProvider = permission => update({ id: permission.raw.id }, permission.raw);

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

const ensureBoundPermissionsInDatabase = async () => {
  if (strapi.EE) {
    return;
  }

  const contentTypes = Object.values(strapi.contentTypes);
  const editorRole = await strapi.query('role', 'admin').findOne({ code: EDITOR_CODE }, []);

  if (isNil(editorRole)) {
    return;
  }

  for (const contentType of contentTypes) {
    const boundActions = getBoundActionsBySubject(editorRole, contentType.uid);

    const permissions = await find({
      subject: contentType.uid,
      action_in: boundActions,
      role: editorRole.id,
    });

    if (permissions.length === 0) {
      return;
    }

    const fields = flow(flatMap('properties.fields'), reject(isNil), uniq)(permissions);

    // Handle the scenario where permissions are missing
    const missingActions = difference(map('action', permissions), boundActions);

    if (missingActions.length > 0) {
      const permissions = missingActions.map(action => ({
        action,
        subject: contentType.uid,
        properties: {
          fields: BOUND_ACTIONS_FOR_FIELDS.includes(action) ? fields : null,
        },
        role: editorRole.id,
      }));

      await createMany(permissions);
    }
  }
};

module.exports = {
  createMany,
  find,
  deleteByRolesIds,
  deleteByIds,
  sanitizePermission,
  findUserPermissions,
  actionProvider,
  createPermissionsManager,
  engine,
  conditionProvider,
  cleanPermissionInDatabase,
  ensureBoundPermissionsInDatabase,
};
