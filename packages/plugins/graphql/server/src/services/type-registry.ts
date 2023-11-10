import { isFunction } from 'lodash/fp';
import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

export type TypeRegistry = {
  register(name: string, definition: any, config?: object): TypeRegistry;
  registerMany(
    definitionsEntries: [string, any][],
    config?: object | ((...args: any[]) => any)
  ): TypeRegistry;
  has(name: string): boolean;
  get(name: string): any;
  toObject(): Record<string, any>;
  types: string[];
  definitions: any[];
  where(predicate: (item: any) => boolean): any[];
};

/**
 * Create a new type registry
 */
const createTypeRegistry = (): TypeRegistry => {
  const registry = new Map();

  const typeRegistry: TypeRegistry = {
    /**
     * Register a new type definition
     */
    register(name, definition, config = {}) {
      if (registry.has(name)) {
        throw new ApplicationError(`"${name}" has already been registered`);
      }

      registry.set(name, { name, definition, config });

      return this;
    },

    /**
     * Register many types definitions at once
     * @param {[string, NexusAcceptedTypeDef][]} definitionsEntries
     * @param {object | function} [config]
     */
    registerMany(definitionsEntries, config = {}) {
      for (const [name, definition] of definitionsEntries) {
        this.register(name, definition, isFunction(config) ? config(name, definition) : config);
      }

      return this;
    },

    /**
     * Check if the given type name has already been added to the registry
     * @param {string} name
     * @return {boolean}
     */
    has(name) {
      return registry.has(name);
    },

    /**
     * Get the type definition for `name`
     * @param {string} name - The name of the type
     */
    get(name) {
      return registry.get(name);
    },

    /**
     * Transform and return the registry as an object
     * @return {Object<string, RegisteredTypeDef>}
     */
    toObject() {
      return Object.fromEntries(registry.entries());
    },

    /**
     * Return the name of every registered type
     * @return {string[]}
     */
    get types() {
      return Array.from(registry.keys());
    },

    /**
     * Return all the registered definitions as an array
     * @return {RegisteredTypeDef[]}
     */
    get definitions() {
      return Array.from(registry.values());
    },

    /**
     * Filter and return the types definitions that matches the given predicate
     * @param {function(RegisteredTypeDef): boolean} predicate
     * @return {RegisteredTypeDef[]}
     */
    where(predicate) {
      return this.definitions.filter(predicate);
    },
  };

  return typeRegistry;
};

export default () => ({
  new: createTypeRegistry,
});
