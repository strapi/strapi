import type { Ability } from '@casl/ability';
import { async } from '@strapi/utils';
import { isEmpty } from 'lodash';

import type { Core, UID, Modules } from '@strapi/types';
import type { PermissionCheckerAction } from '../types/services';

export const ACTIONS = {
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
  ({ userAbility, model }: { userAbility: Ability; model: string }) => {
    const permissionsManager = strapi
      .service('admin::permission')
      .createPermissionsManager({ ability: userAbility, model });

    const { actionProvider } = strapi.service('admin::permission');

    const toSubject = (entity?: Entity) => {
      return entity ? permissionsManager.toSubject(entity, model) : model;
    };

    const can = (action: string, entity: Entity | undefined, field: string) => {
      const subject = toSubject(entity);
      const aliases = actionProvider.unstable_aliases(action, model) as string[];

      return (
        // Test the original action to see if it passes
        userAbility.can(action, subject, field) ||
        // Else try every known alias if at least one of them succeed, then the user "can"
        aliases.some((alias) => userAbility.can(alias, subject, field))
      );
    };

    const cannot = (action: string, entity: Entity | undefined, field: string) => {
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

    const getRulesForAction = (action: string) => {
      if (typeof userAbility.rulesFor !== 'function') {
        return [];
      }

      const aliases = actionProvider.unstable_aliases(action, model) as string[];
      const actions = [action, ...aliases];

      return actions.flatMap((actionName) => userAbility.rulesFor(actionName, model));
    };

    // Tell callers if we need the full entity to check access
    const requiresEntity = (action: string) => {
      if (typeof userAbility.rulesFor !== 'function') {
        return true;
      }

      const rules = getRulesForAction(action);

      return rules.some((rule: any) => rule.conditions && !isEmpty(rule.conditions));
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

    /** One shortcut per Content Manager action, e.g. `can.read(entity)`. */
    const actionShortcuts = <TShortcut>(
      toShortcut: (action: (typeof ACTIONS)[PermissionCheckerAction]) => TShortcut
    ) => {
      const shortcuts = {} as Record<PermissionCheckerAction, TShortcut>;
      for (const name of Object.keys(ACTIONS) as PermissionCheckerAction[]) {
        shortcuts[name] = toShortcut(ACTIONS[name]);
      }
      return shortcuts;
    };

    // Sanitized queries shortcuts
    Object.assign(
      sanitizedQuery,
      actionShortcuts(
        (action) => (query: Query) =>
          // @ts-expect-error TODO
          sanitizedQuery(query, action)
      )
    );

    // Permission utils shortcuts
    Object.assign(
      can,
      actionShortcuts(
        (action) =>
          (...args: [entity: Entity | undefined, field: string]) =>
            can(action, ...args)
      )
    );
    Object.assign(
      cannot,
      actionShortcuts(
        (action) =>
          (...args: [entity: Entity | undefined, field: string]) =>
            cannot(action, ...args)
      )
    );
    Object.assign(
      requiresEntity,
      actionShortcuts((action) => () => requiresEntity(action))
    );

    return {
      // Permission utils
      can, // check if you have the permission
      cannot, // check if you don't have the permission
      requiresEntity, // check if entity data is needed for permission evaluation
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

// The published type stays the inferred one, as on develop. The registered contract
// (`PermissionCheckerService`) also describes the action shortcuts attached at runtime.
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  create: createPermissionChecker(strapi),
});
