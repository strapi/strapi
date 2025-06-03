import { async } from '@strapi/utils';
import type { Core, UID, Modules } from '@strapi/types';

const ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  update: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
  publish: 'plugin::content-manager.explorer.publish',
  unpublish: 'plugin::content-manager.explorer.publish',
  discard: 'plugin::content-manager.explorer.update',
} as const;

type Entity = Modules.EntityService.Result<UID.ContentType>;
type Query = {
  page?: string;
  pageSize?: string;
  sort?: string;
};

const createPermissionChecker =
  (strapi: Core.Strapi) =>
  ({ userAbility, model }: { userAbility: any; model: string }) => {
    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      model,
    });

    const { actionProvider } = strapi.service('admin::permission');

    const toSubject = (entity?: Entity) => {
      return entity ? permissionsManager.toSubject(entity, model) : model;
    };

    // @ts-expect-error preserve the parameter order
    // eslint-disable-next-line @typescript-eslint/default-param-last
    const can = (action: string, entity?: Entity, field: string) => {
      const subject = toSubject(entity);
      const aliases = actionProvider.unstable_aliases(action, model) as string[];

      return (
        // Test the original action to see if it passes
        userAbility.can(action, subject, field) ||
        // Else try every known alias if at least one of them succeed, then the user "can"
        aliases.some((alias) => userAbility.can(alias, subject, field))
      );
    };

    // @ts-expect-error preserve the parameter order
    // eslint-disable-next-line @typescript-eslint/default-param-last
    const cannot = (action: string, entity?: Entity, field: string) => {
      const subject = toSubject(entity);
      const aliases = actionProvider.unstable_aliases(action, model) as string[];

      return (
        // Test both the original action
        userAbility.cannot(action, subject, field) &&
        // and every known alias, if all of them fail (cannot), then the user truly "cannot"
        aliases.every((alias) => userAbility.cannot(alias, subject, field))
      );
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
      return async.pipe(
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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  create: createPermissionChecker(strapi),
});
