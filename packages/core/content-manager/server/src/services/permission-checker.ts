import { pipeAsync } from '@strapi/utils';
import { LoadedStrapi as Strapi, EntityService, Common } from '@strapi/types';

const ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  update: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
  publish: 'plugin::content-manager.explorer.publish',
  unpublish: 'plugin::content-manager.explorer.publish',
} as const;

type Entity = EntityService.Result<Common.UID.ContentType>;
type Query = {
  page?: string;
  pageSize?: string;
  sort?: string;
};

const createPermissionChecker =
  (strapi: Strapi) =>
  ({ userAbility, model }: { userAbility: any; model: string }) => {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      model,
    });

    const toSubject = (entity?: Entity) =>
      entity ? permissionsManager.toSubject(entity, model) : model;

    // @ts-expect-error preserve the parameter order
    // eslint-disable-next-line @typescript-eslint/default-param-last
    const can = (action: string, entity?: Entity, field: string) => {
      return userAbility.can(action, toSubject(entity), field);
    };

    // @ts-expect-error preserve the parameter order
    // eslint-disable-next-line @typescript-eslint/default-param-last
    const cannot = (action: string, entity?: Entity, field: string) => {
      return userAbility.cannot(action, toSubject(entity), field);
    };

    const sanitizeOutput = (data: Entity, { action = ACTIONS.read }: { action?: string } = {}) => {
      return permissionsManager.sanitizeOutput(data, { subject: toSubject(data), action });
    };

    const sanitizeQuery = (query: Query, { action = ACTIONS.read }: { action?: string } = {}) => {
      return permissionsManager.sanitizeQuery(query, { subject: model, action });
    };

    const sanitizeInput = (action: string, data: any, entity?: Entity) => {
      return permissionsManager.sanitizeInput(data, {
        subject: entity ? toSubject(entity) : model,
        action,
      });
    };

    const validateQuery = (query: Query, { action = ACTIONS.read }: { action?: string } = {}) => {
      return permissionsManager.validateQuery(query, { subject: model, action });
    };

    const validateInput = (action: string, data: any, entity?: Entity) => {
      return permissionsManager.validateInput(data, {
        subject: entity ? toSubject(entity) : model,
        action,
      });
    };

    const sanitizeCreateInput = (data: any) => sanitizeInput(ACTIONS.create, data);
    const sanitizeUpdateInput = (entity: Entity) => (data: any) =>
      sanitizeInput(ACTIONS.update, data, entity);

    const buildPermissionQuery = (query: Query, action: { action?: string } = {}) => {
      return permissionsManager.addPermissionsQueryTo(query, action);
    };

    const sanitizedQuery = (query: Query, action: { action?: string } = {}) => {
      return pipeAsync(
        (q: Query) => sanitizeQuery(q, action),
        (q: Query) => buildPermissionQuery(q, action)
      )(query);
    };

    // Sanitized queries shortcuts
    Object.keys(ACTIONS).forEach((action) => {
      // @ts-expect-error TODO
      sanitizedQuery[action] = (query: Query) => sanitizedQuery(query, ACTIONS[action]);
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

export default ({ strapi }: { strapi: Strapi }) => ({
  create: createPermissionChecker(strapi),
});
