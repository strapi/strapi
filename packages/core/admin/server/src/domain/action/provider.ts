import { providerFactory, hooks } from '@strapi/utils';
import { validateRegisterProviderAction } from '../../validation/action-provider';
import domain from './index';

/**
 * @typedef ActionProviderOverride
 * @property {function(CreateActionPayload)} register
 * @property {function(attributes CreateActionPayload[]): Promise<this>} registerMany
 */

/**
 * Creates a new instance of an action provider
 * @return {Provider & ActionProviderOverride}
 */
const createActionProvider = (options: any) => {
  const provider = providerFactory(options);
  const actionHooks = {
    appliesPropertyToSubject: hooks.createAsyncParallelHook(),
  };

  return {
    ...provider,

    hooks: {
      ...provider.hooks,
      ...actionHooks,
    },

    async register(actionAttributes: any) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new actions outside of the bootstrap function.`);
      }

      validateRegisterProviderAction([actionAttributes]);

      const action = domain.create(actionAttributes) as any;

      return provider.register(action.actionId, action);
    },

    async registerMany(actionsAttributes: any) {
      validateRegisterProviderAction(actionsAttributes);

      for (const attributes of actionsAttributes) {
        await this.register(attributes);
      }

      return this;
    },

    async appliesToProperty(property: string, actionId: string, subject: string) {
      const action = provider.get(actionId) as any;
      // @ts-expect-error
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
  };
};

module.exports = createActionProvider;
