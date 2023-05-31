'use strict';

const { pipeAsync } = require('@strapi/utils');

const ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  update: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
  publish: 'plugin::content-manager.explorer.publish',
  unpublish: 'plugin::content-manager.explorer.publish',
};

const createPermissionChecker =
  (strapi) =>
  ({ userAbility, model }) => {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      model,
    });

    const toSubject = (entity) => (entity ? permissionsManager.toSubject(entity, model) : model);

    const can = (action, entity, field) => {
      return userAbility.can(action, toSubject(entity), field);
    };

    const cannot = (action, entity, field) => {
      return userAbility.cannot(action, toSubject(entity), field);
    };

    const sanitizeOutput = (data, { action = ACTIONS.read } = {}) => {
      return permissionsManager.sanitizeOutput(data, { subject: toSubject(data), action });
    };

    const sanitizeQuery = (query, { action = ACTIONS.read } = {}) => {
      return permissionsManager.sanitizeQuery(query, { subject: model, action });
    };

    const sanitizeInput = (action, data, entity) => {
      return permissionsManager.sanitizeInput(data, {
        subject: entity ? toSubject(entity) : model,
        action,
      });
    };

    const sanitizeCreateInput = (data) => sanitizeInput(ACTIONS.create, data);
    const sanitizeUpdateInput = (entity) => (data) => sanitizeInput(ACTIONS.update, data, entity);

    const buildPermissionQuery = (query, action) => {
      return permissionsManager.addPermissionsQueryTo(query, action);
    };

    /**
     * @param {string} query
     * @param {keyof typeof ACTIONS} action
     */
    const sanitizedQuery = (query, action) => {
      return pipeAsync(
        (q) => sanitizeQuery(q, action),
        (q) => buildPermissionQuery(q, action)
      )(query);
    };

    // Sanitized queries shortcuts
    Object.keys(ACTIONS).forEach((action) => {
      sanitizedQuery[action] = (query) => sanitizedQuery(query, ACTIONS[action]);
    });

    // Permission utils shortcuts
    Object.keys(ACTIONS).forEach((action) => {
      can[action] = (...args) => can(ACTIONS[action], ...args);
      cannot[action] = (...args) => cannot(ACTIONS[action], ...args);
    });

    return {
      // Permission utils
      can,
      cannot,
      // Sanitizers
      sanitizeOutput,
      sanitizeQuery,
      sanitizeCreateInput,
      sanitizeUpdateInput,
      // Queries Builder
      sanitizedQuery,
    };
  };

module.exports = ({ strapi }) => ({
  create: createPermissionChecker(strapi),
});
