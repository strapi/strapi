import '@strapi/types';

/** An SSO provider, keyed by its `uid` in the registry. */
type SSOProvider = { uid: string; [key: string]: unknown };

export default () => {
  const registry = new Map<string, SSOProvider>();

  return Object.assign(registry, {
    register(provider: SSOProvider) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new provider after the bootstrap`);
      }

      // TODO
      // @ts-expect-error check map types
      this.set(provider.uid, provider);
    },

    registerMany(providers: SSOProvider[]) {
      providers.forEach((provider) => {
        this.register(provider);
      });
    },

    getAll(): SSOProvider[] {
      // TODO
      // @ts-expect-error check map types
      return Array.from(this.values());
    },
  });
};
