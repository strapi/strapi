import { isFunction } from 'lodash/fp';
import Utils from '@strapi/utils';

const { ApplicationError } = Utils.errors;

interface RegisteredTypeDef {
  name: string;
  definition: any;
  config: any;
}
/**
 * Create a new type registry
 */
const createTypeRegistry = () => {
  const registry = new Map<string, RegisteredTypeDef>();

  return {
    register(name: string, definition: any, config = {}) {
      if (registry.has(name)) {
        throw new ApplicationError(`"${name}" has already been registered`);
      }

      registry.set(name, { name, definition, config });

      return this;
    },

    /**
     * Register many types definitions at once
     */
    registerMany(definitionsEntries: string[], config: any = {}) {
      for (const [name, definition] of definitionsEntries) {
        this.register(name, definition, isFunction(config) ? config(name, definition) : config);
      }

      return this;
    },

    /**
     * Check if the given type name has already been added to the registry
     */
    has(name: string) {
      return registry.has(name);
    },

    /**
     * Get the type definition for `name`
     */
    get(name: string) {
      return registry.get(name);
    },

    /**
     * Transform and return the registry as an object
     */
    toObject() {
      return Object.fromEntries(registry.entries());
    },

    /**
     * Return the name of every registered type
     */
    get types(): string[] {
      return Array.from(registry.keys());
    },

    /**
     * Return all the registered definitions as an array
     */
    get definitions() {
      return Array.from(registry.values());
    },

    /**
     * Filter and return the types definitions that matches the given predicate
     */
    where(predicate: (typeDef: RegisteredTypeDef) => boolean) {
      return this.definitions.filter(predicate);
    },
  };
};

export default () => ({
  new: createTypeRegistry,
});
