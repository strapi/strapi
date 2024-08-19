import { providerFactory, hooks, errors } from '@strapi/utils';
import { validateRegisterProviderAction } from '../../validation/action-provider';

import domain from './index';
import type { Action, CreateActionPayload } from './index';
import type { Permission } from '../../../../shared/contracts/shared';

type Options = Parameters<typeof providerFactory>['0'];

const { ApplicationError } = errors;

/**
 * Creates a new instance of an action provider
 */
const createActionProvider = (options?: Options) => {
  const provider = providerFactory<Action>(options);
  const actionHooks = {
    appliesPropertyToSubject: hooks.createAsyncParallelHook(),
  };

  return {
    ...provider,

    hooks: {
      ...provider.hooks,
      ...actionHooks,
    },

    async register(actionAttributes: CreateActionPayload) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new actions outside of the bootstrap function.`);
      }

      validateRegisterProviderAction([actionAttributes]);

      const action = domain.create(actionAttributes);

      return provider.register(action.actionId, action);
    },

    async registerMany(actionsAttributes: CreateActionPayload[]) {
      validateRegisterProviderAction(actionsAttributes);

      for (const attributes of actionsAttributes) {
        await this.register(attributes);
      }

      return this;
    },

    async appliesToProperty(property: string, actionId: string, subject: Permission['subject']) {
      const action = provider.get(actionId) as Action | undefined;
      if (!action) {
        throw new ApplicationError(`No action found with id "${actionId}"`);
      }

      const appliesToAction = domain.appliesToProperty(property, action);

      // If the property isn't valid for this action, ignore the rest of the checks
      if (!appliesToAction) {
        return false;
      }

      // If the property is valid for this action and there isn't any subject
      if (!subject) {
        return true;
      }

      // If the property is valid for this action and the subject is not handled by the action
      if (!domain.appliesToSubject(subject, action)) {
        return false;
      }

      const results = await actionHooks.appliesPropertyToSubject.call({
        property,
        action,
        subject,
      });

      return results.every((result) => result !== false);
    },

    /**
     * @experimental
     */
    unstable_aliases(actionId: string, subject?: string | null): string[] {
      const isRegistered = this.has(actionId);

      if (!isRegistered) {
        return [];
      }

      return this.values()
        .filter((action) =>
          action.aliases?.some((alias) => {
            // Only look at alias with the correct actionId
            if (alias.actionId !== actionId) {
              return false;
            }

            // If the alias don't have a list of required subjects, keep it
            if (!Array.isArray(alias.subjects)) {
              return true;
            }

            // If the alias require specific subjects but none is provided, skip it
            if (!subject) {
              return false;
            }

            // Else, make sure the given subject is allowed
            return alias.subjects.includes(subject);
          })
        )
        .map((action) => action.actionId);
    },
  };
};

export default createActionProvider;
