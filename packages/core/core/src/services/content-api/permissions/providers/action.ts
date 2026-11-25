import { providerFactory } from '@strapi/utils';

export default (options = {}) => {
  const provider = providerFactory(options);

  return {
    ...provider,

    async register(action: string, payload: Record<string, unknown>) {
      if (strapi.isLoaded) {
        throw new Error(
          `You can't register new actions after Strapi has loaded. Register actions in a register or bootstrap function.`
        );
      }

      return provider.register(action, payload);
    },
  };
};
