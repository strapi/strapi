'use strict';

const createTypeRegistry = () => {
  const registry = new Map();

  return {
    register(name, definition) {
      if (registry.has(name)) {
        throw new Error(`The type named "${name}" has already been registered`);
      }

      registry.set(name, definition);
    },

    registerMany(types) {
      for (const [name, definition] of Object.entries(types)) {
        this.register(name, definition);
      }
    },

    delete(name) {
      registry.delete(name);
    },

    has(name) {
      return registry.has(name);
    },

    get entries() {
      return Object.fromEntries(registry.entries());
    },

    get types() {
      return Array.from(registry.keys());
    },

    get definitions() {
      return Array.from(registry.values());
    },
  };
};

module.exports = { createTypeRegistry };
