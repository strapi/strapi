'use strict';

const _ = require('lodash');
const { flatMap, filter } = require('lodash/fp');
const pmap = require('p-map');
const { getBoundActionsBySubject, BOUND_ACTIONS_FOR_FIELDS } = require('../domain/role');
const { createPermission } = require('../domain/permission');
const createPermissionsManager = require('./permission/permissions-manager');
const createConditionProvider = require('./permission/condition-provider');
const createPermissionEngine = require('./permission/engine');
const actionProvider = require('./permission/action-provider');
const { EDITOR_CODE } = require('./constants');

const conditionProvider = createConditionProvider();
const engine = createPermissionEngine(conditionProvider);

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
 * Create many permissions
 * @param permissions
 * @returns {Promise<*[]|*>}
 */
const createMany = async permissions => {
  return strapi.query('permission', 'admin').createMany(permissions);
};

/**
 * Update a permission
 * @returns {Promise<*[]|*>}
 * @param params
 * @param attributes
 */
const update = async (params, attributes) => {
  return strapi.query('permission', 'admin').update(params, attributes);
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
    const promiseProvider = perm => update({ id: perm.id }, perm);

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

const ensureBoundPermissionsInDatabase = async () => {
  if (strapi.EE) {
    return;
  }

  const contentTypes = Object.values(strapi.contentTypes);
  const editorRole = await strapi.query('role', 'admin').findOne({ code: EDITOR_CODE }, []);

  if (_.isNil(editorRole)) {
    return;
  }

  for (const contentType of contentTypes) {
    const boundActions = getBoundActionsBySubject(editorRole, contentType.uid);
    const permissions = await strapi.query('permission', 'admin').find(
      {
        subject: contentType.uid,
        action_in: boundActions,
        role: editorRole.id,
      },
      []
    );

    if (permissions.length === 0) {
      return;
    }

    const fields = _.flow(flatMap('fields'), filter(_.negate(_.isNil)), _.uniq)(permissions);

    // Handle the scenario where permissions are missing

    const missingActions = _.difference(boundActions, _.map(permissions, 'action'));

    if (missingActions.length > 0) {
      const permissions = missingActions.map(action =>
        createPermission({
          action,
          subject: contentType.uid,
          role: editorRole.id,
          fields: BOUND_ACTIONS_FOR_FIELDS.includes(action) ? fields : null,
        })
      );
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
