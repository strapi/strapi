import { pipeAsync } from '@strapi/utils';

const ACTIONS: any = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  update: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
  publish: 'plugin::content-manager.explorer.publish',
  unpublish: 'plugin::content-manager.explorer.publish',
};

const createPermissionChecker =
  (strapi: any) =>
  ({ userAbility, model }: any) => {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      model,
    });

    const toSubject = (entity: any) =>
      entity ? permissionsManager.toSubject(entity, model) : model;

    const can = (action: any, entity: any, field: any) => {
      return userAbility.can(action, toSubject(entity), field);
    };

    const cannot = (action: any, entity: any, field: any) => {
      return userAbility.cannot(action, toSubject(entity), field);
    };

    const sanitizeOutput = (data: any, { action = ACTIONS.read } = {}) => {
      return permissionsManager.sanitizeOutput(data, { subject: toSubject(data), action });
    };

    const sanitizeQuery = (query: any, { action = ACTIONS.read } = {}) => {
      return permissionsManager.sanitizeQuery(query, { subject: model, action });
    };

    const sanitizeInput = (action: any, data: any, entity?: any) => {
      return permissionsManager.sanitizeInput(data, {
        subject: entity ? toSubject(entity) : model,
        action,
      });
    };

    const validateQuery = (query: any, { action = ACTIONS.read } = {}) => {
      return permissionsManager.validateQuery(query, { subject: model, action });
    };

    const validateInput = (action: any, data: any, entity: any) => {
      return permissionsManager.validateInput(data, {
        subject: entity ? toSubject(entity) : model,
        action,
      });
    };

    const sanitizeCreateInput = (data: any) => sanitizeInput(ACTIONS.create, data);
    const sanitizeUpdateInput = (entity: any) => (data: any) =>
      sanitizeInput(ACTIONS.update, data, entity);

    const buildPermissionQuery = (query: any, action: any) => {
      return permissionsManager.addPermissionsQueryTo(query, action);
    };

    /**
     * @param {string} query
     * @param {keyof typeof ACTIONS} action
     */
    const sanitizedQuery = (query: any, action: any) => {
      return pipeAsync(
        (q: any) => sanitizeQuery(q, action),
        (q: any) => buildPermissionQuery(q, action)
      )(query);
    };

    // Sanitized queries shortcuts
    Object.keys(ACTIONS).forEach((action: any) => {
      // @ts-expect-error TODO
      sanitizedQuery[action] = (query: any) => sanitizedQuery(query, ACTIONS[action]);
    });

    // Permission utils shortcuts
    Object.keys(ACTIONS).forEach((action) => {
      // @ts-expect-error TODO
      can[action] = (...args: any) => can(ACTIONS[action], ...args);
      // @ts-expect-error TODO
      cannot[action] = (...args: any) => cannot(ACTIONS[action], ...args);
    });

    return {
      // Permission utils
      can, // check if you have the permission
      cannot, // check if you don't have the permission
      // Sanitizers
      sanitizeOutput,
      sanitizeQuery,
      sanitizeCreateInput,
      sanitizeUpdateInput,
      // Validators
      validateQuery,
      validateInput,
      // Queries Builder
      sanitizedQuery,
    };
  };

export default ({ strapi }: any) => ({
  create: createPermissionChecker(strapi),
});
