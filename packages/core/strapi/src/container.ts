import type { Strapi, Container } from '@strapi/types';

export const createContainer = (strapi: Strapi): Container => {
  const registered = new Map<string, unknown>();
  const resolved = new Map();

  return {
    register<T, U extends string>(name: U, resolver: T) {
      if (registered.has(name)) {
        throw new Error(`Cannot register already registered service ${name}`);
      }

      registered.set(name, resolver);
      return this;
    },

    get(name: string, args?: unknown) {
      // TODO: handle singleton vs reinstanciation everytime
      if (resolved.has(name)) {
        return resolved.get(name);
      }

      if (registered.has(name)) {
        const resolver = registered.get(name);

        if (typeof resolver === 'function') {
          resolved.set(name, resolver({ strapi }, args));
        } else {
          resolved.set(name, resolver);
        }

        return resolved.get(name);
      }

      throw new Error(`Could not resolve service ${name}`);
    },

    // TODO: implement
    extend() {
      return this;
    },
  };
};
