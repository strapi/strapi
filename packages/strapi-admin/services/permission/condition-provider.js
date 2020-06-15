'use strict';

const _ = require('lodash');

module.exports = (defaultConditions = {}) => {
  const _registry = new Map(Object.entries(defaultConditions));

  return {
    /**
     * Register a new condition with its associated unique key.
     * @throws Error if the key already exists
     * @param name
     * @param condition
     */
    register(name, condition) {
      if (this.has(name)) {
        throw new Error(
          `Error while trying to add condition "${name}" to the registry. "${name}" already exists.`
        );
      }

      _registry.set(name, condition);
    },

    /**
     * Shorthand for batch-register operations.
     * Internally calls `register` for each key/value couple.
     * @param conditionsMap
     */
    registerMany(conditionsMap) {
      _.each(conditionsMap, (value, key) => this.register(key, value));
    },

    /**
     * Deletes a condition by its key
     * @param key
     */
    delete(key) {
      if (this.has(key)) {
        _registry.delete(key);
      }
    },

    /**
     * Returns the keys of the conditions registry.
     * @returns {string[]}
     */
    conditions() {
      return Array.from(_registry.keys());
    },

    /**
     * Get a condition by its key
     * @param name
     * @returns {any}
     */
    get(name) {
      return _registry.get(name);
    },

    /**
     * Check if a key is already present in the registry
     * @param name
     * @returns {boolean} true if the key is present in the registry, false otherwise.
     */
    has(name) {
      return _registry.has(name);
    },

    defaultConditions,
  };
};
