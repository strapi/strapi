import '@strapi/types';

export default () => {
  const registry = new Map();

  Object.assign(registry, {
    register(provider: any) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new provider after the bootstrap`);
      }

      // @ts-expect-error
      this.set(provider.uid, provider);
    },

    registerMany(providers: any[]) {
      providers.forEach((provider) => {
        this.register(provider);
      });
    },

    // @ts-expect-error
    getAll() {
      // @ts-expect-error
      return Array.from(this.values());
    },
  });

  return registry;
};
