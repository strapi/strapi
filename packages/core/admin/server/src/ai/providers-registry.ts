import { Modules } from '@strapi/types';

export const createAiProvidersRegistry = (): Modules.AI.AiProvidersRegistry => {
  let provider: Modules.AI.AiProvider | null = null;

  return {
    register(newProvider: Modules.AI.AiProvider) {
      if (provider !== null) {
        throw new Error('An AI provider has already been registered');
      }

      provider = newProvider;
    },
    get() {
      if (provider === null) {
        throw new Error('No AI provider registered');
      }

      return provider;
    },
  };
};
