'use strict';

const _ = require('lodash');
const { getConditionId, createCondition } = require('../../domain/condition');

module.exports = () => {
  const _registry = new Map();

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

      _registry.set(conditionId, createCondition(condition));
    },

    /**
     * Shorthand for batch-register operations.
     * Internally calls `register` for each condition.
     * @param conditions
     */
    registerMany(conditions) {
      _.each(conditions, this.register.bind(this));
    },

    /**
     * Check if a key is already present in the registry
     * @param name
     * @param plugin
     * @returns {boolean} true if the condition is present in the registry, false otherwise.
     */
    has(name, plugin) {
      return _registry.has(getConditionId({ name, plugin }));
    },

    /**
     * Get a condition by its name and plugin
     * @param {string} name
     * @param {string} plugin
     * @returns {any}
     */
    get(name, plugin) {
      return _registry.get(getConditionId({ name, plugin }));
    },

    /**
     * Get a condition by its id
     * @param {string} id
     * @returns {any}
     */
    getById(id) {
      return _registry.get(id);
    },

    /**
     * Returns all the registered conditions.
     * @returns {any[]}
     */
    getAll() {
      return Array.from(_registry.values());
    },
  };
};
