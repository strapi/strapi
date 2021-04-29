'use strict';

const { providerFactory, hooks } = require('strapi-utils');
const { validateRegisterProviderAction } = require('../../validation/action-provider');
const domain = require('./index');

/**
 * @typedef ActionProviderOverride
 * @property {function(CreateActionPayload)} register
 * @property {function(attributes CreateActionPayload[]): Promise<this>} registerMany
 */

/**
 * Creates a new instance of an action provider
 * @return {Provider & ActionProviderOverride}
 */
const createActionProvider = options => {
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

    async register(actionAttributes) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new actions outside of the bootstrap function.`);
      }

      validateRegisterProviderAction([actionAttributes]);

      const action = domain.create(actionAttributes);

      return provider.register(action.actionId, action);
    },

    async registerMany(actionsAttributes) {
      validateRegisterProviderAction(actionsAttributes);

      for (const attributes of actionsAttributes) {
        await this.register(attributes);
      }

      return this;
    },

    async appliesToProperty(property, actionId, subject) {
      const action = provider.get(actionId);
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

      return results.every(result => result !== false);
    },
  };
};

module.exports = createActionProvider;
