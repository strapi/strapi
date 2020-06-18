'use strict';

const _ = require('lodash');
const { getConditionId, createCondition } = require('../../domain/condition');

module.exports = () => {
  const registry = new Map();

  return {
    /**
     * Register a new condition
     * @throws Error if the conditionId already exists
     * @param condition
     */
    register(condition) {
      const conditionId = getConditionId(condition);

      if (strapi.isLoaded) {
        throw new Error(`You can't register new conditions outside of the bootstrap function.`);
      }

      if (this.has(condition.name, condition.plugin)) {
        throw new Error(`Duplicated condition id: ${getConditionId(condition)}.`);
      }

      registry.set(conditionId, createCondition(condition));
      return this;
    },

    /**
     * Shorthand for batch-register operations.
     * Internally calls `register` for each condition.
     * @param conditions
     */
    registerMany(conditions) {
      _.each(conditions, condition => this.register(condition));
      return this;
    },

    /**
     * Check if a key is already present in the registry
     * @param name
     * @param plugin
     * @returns {boolean} true if the condition is present in the registry, false otherwise.
     */
    has(name, plugin) {
      return registry.has(getConditionId({ name, plugin }));
    },

    /**
     * Get a condition by its name and plugin
     * @param {string} name
     * @param {string} plugin
     * @returns {any}
     */
    get(name, plugin) {
      return registry.get(getConditionId({ name, plugin }));
    },

    /**
     * Get a condition by its id
     * @param {string} id
     * @returns {any}
     */
    getById(id) {
      return registry.get(id);
    },

    /**
     * Returns all the registered conditions.
     * @returns {any[]}
     */
    getAll() {
      return Array.from(registry.values());
    },
  };
};
