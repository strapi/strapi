import { providerFactory } from '@strapi/utils';
import domain from '.';

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

    async register(conditionAttributes: any) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new conditions outside of the bootstrap function.`);
      }

      const condition = domain.create(conditionAttributes);

      return provider.register(condition.id, condition);
    },

    async registerMany(conditionsAttributes: any) {
      for (const attributes of conditionsAttributes) {
        await this.register(attributes);
      }

      return this;
    },
  };
};

export default createConditionProvider;
