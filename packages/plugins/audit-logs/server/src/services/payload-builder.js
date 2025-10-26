'use strict';

const createPayloadStrategy = require('../strategies/create-payload');
const updatePayloadStrategy = require('../strategies/update-payload');
const deletePayloadStrategy = require('../strategies/delete-payload');
const { createLogger } = require('../utils');

/**
 * Payload Builder Service
 * Builds payloads based on action type using different strategies
 */
module.exports = ({ strapi }) => {
  const logger = createLogger(strapi);

  return {
  strategies: {
    create: createPayloadStrategy,
    update: updatePayloadStrategy,
    delete: deletePayloadStrategy,
  },

  /**
   * Build payload for a lifecycle event
   * @param {string} action - The action type (create, update, delete)
   * @param {object} event - The lifecycle event
   * @returns {object} The built payload
   */
  build(action, event) {
    try {
      const strategy = this.strategies[action];

      if (!strategy) {
        logger.warn(`No payload strategy found for action: ${action}`);
        return {
          action,
          raw: event.params || {},
        };
      }

      return strategy.build(event);
    } catch (error) {
      logger.error('Failed to build payload', error);
      return {
        action,
        error: 'Failed to build payload',
      };
    }
  },

  /**
   * Register a custom payload strategy
   * Allows extending the plugin without modifying its code
   * @param {string} action - The action type
   * @param {object} strategy - The strategy object with build method
   */
  registerStrategy(action, strategy) {
    if (!strategy.build || typeof strategy.build !== 'function') {
      throw new Error(`Strategy for action "${action}" must have a build method`);
    }

    this.strategies[action] = strategy;
    logger.info(`Registered custom payload strategy for action: ${action}`);
  },
  };
};
