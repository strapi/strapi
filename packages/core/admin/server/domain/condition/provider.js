'use strict';

const { providerFactory } = require('@strapi/utils');
const domain = require('.');

/**
 * @typedef ConditionProviderOverride
 * @property {function(CreateConditionPayload)} register
 * @property {function(attributes CreateConditionPayload[]): Promise<this>} registerMany
 */

/**
 * Creates a new instance of a condition provider
 * @return {Provider & ConditionProviderOverride}
 */
const createConditionProvider = () => {
  const provider = providerFactory();

  return {
    ...provider,

    async register(conditionAttributes) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new conditions outside of the bootstrap function.`);
      }

      const condition = domain.create(conditionAttributes);

      return provider.register(condition.id, condition);
    },

    async registerMany(conditionsAttributes) {
      for (const attributes of conditionsAttributes) {
        await this.register(attributes);
      }

      return this;
    },
  };
};

module.exports = createConditionProvider;
