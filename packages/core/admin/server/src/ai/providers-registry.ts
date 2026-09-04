import { Core, Modules } from '@strapi/types';

// TODO discuss with the team: this registry and the provider calls live in @strapi/admin, so
// feature plugins reach them through strapi.ai.admin. ai.admin is the admin-panel license/token
// broker, and it is instantiated lazily, which makes provider registration order depend on the
// first caller. Moving the registry to an @strapi/core provider (like ai.mcp) would expose it as
// strapi.ai and make registration deterministic.
export const createAiProvidersRegistry = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): Modules.AI.AiProvidersRegistry => {
  let provider: Modules.AI.AiProvider | null = null;

  if (!strapi.ee?.isEE) {
    return {
      isEnabled() {
        return false;
      },
      register() {
        throw new Error('AI providers require a valid license');
      },
      get() {
        throw new Error('AI providers require a valid license');
      },
    };
  }

  return {
    isEnabled() {
      return provider !== null;
    },
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
