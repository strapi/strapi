import '@strapi/types';

export default () => {
  const registry = new Map();

  Object.assign(registry, {
    register(provider: unknown) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new provider after the bootstrap`);
      }

      // TODO
      // @ts-expect-error check map types
      this.set(provider.uid, provider);
    },

    registerMany(providers: unknown[]) {
      providers.forEach((provider) => {
        this.register(provider);
      });
    },

    getAll(): unknown[] {
      // TODO
      // @ts-expect-error check map types
      return Array.from(this.values());
    },
  });

  return registry;
};
