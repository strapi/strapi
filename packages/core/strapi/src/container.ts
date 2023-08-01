import type { Strapi } from './Strapi';

export type Resolver = (container: { strapi: Strapi }, args: unknown) => unknown | unknown;

export const createContainer = (strapi: Strapi) => {
  const registered = new Map<string, Resolver>();
  const resolved = new Map();

  return {
    register<T extends Resolver, U extends string>(name: U, resolver: T) {
      if (registered.has(name)) {
        throw new Error(`Cannot register already registered service ${name}`);
      }

      registered.set(name, resolver);
      return this as typeof this & { [key in U]: T };
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
    extend() {},
  };
};
