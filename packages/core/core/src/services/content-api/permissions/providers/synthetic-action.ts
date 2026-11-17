import { providerFactory } from '@strapi/utils';

/**
 * Actions that no controller method backs, such as `api::article.article.read-drafts` and
 * `api::article.article.publish`: data rules, never route scopes.
 *
 * They are kept out of the action provider on purpose: its keys are the actions an API token may be
 * granted, and what the admin checks token permissions against at boot.
 */
export default (options = {}) => {
  const provider = providerFactory(options);

  return {
    ...provider,

    async register(action: string, payload: Record<string, unknown>) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new actions outside the bootstrap function.`);
      }

      return provider.register(action, payload);
    },
  };
};
