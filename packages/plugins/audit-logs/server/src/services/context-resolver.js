'use strict';

const { createLogger } = require('../utils');

/**
 * Context Resolver Service
 * Extracts user information from the request context
 */
module.exports = ({ strapi }) => {
  const logger = createLogger(strapi);

  return {
  /**
   * Resolve user context from the current request
   * @returns {object|null} User context with id and email, or null if no user
   */
  resolveUser() {
    try {
      const ctx = strapi.requestContext.get();

      if (!ctx || !ctx.state || !ctx.state.user) {
        return null;
      }

      const user = ctx.state.user;

      return {
        id: user.id || null,
        email: user.email || user.username || null,
      };
    } catch (error) {
      logger.debug('Failed to resolve user context', error);
      return null;
    }
  },

  /**
   * Check if the current request is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    const user = this.resolveUser();
    return user !== null && user.id !== null;
  },
  };
};
