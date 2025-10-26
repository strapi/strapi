'use strict';

const { createLogger } = require('./logger');

/**
 * Error Handler Utility
 * Centralized error handling for controllers
 */

/**
 * Check if error is a validation error
 * @param {Error} error - Error object
 * @returns {boolean} True if validation error
 */
function isValidationError(error) {
  return error.message && (
    error.message.includes('Invalid') ||
    error.message.includes('Must be') ||
    error.name === 'ValidationError'
  );
}

/**
 * Handle controller errors with consistent logging and response formatting
 * @param {object} ctx - Koa context
 * @param {Error} error - Error object
 * @param {string} operation - Operation description (e.g., 'find audit logs')
 * @param {object} strapi - Strapi instance
 */
function handleControllerError(ctx, error, operation, strapi) {
  const logger = createLogger(strapi);

  // Log the error
  logger.error(`Failed to ${operation}`, {
    error: error.message,
    stack: error.stack,
  });

  // Handle validation errors with 400 status
  if (isValidationError(error)) {
    return ctx.badRequest(error.message);
  }

  // Handle not found errors
  if (error.statusCode === 404 || error.name === 'NotFoundError') {
    return ctx.notFound(error.message || `Resource not found`);
  }

  // Handle unauthorized errors
  if (error.statusCode === 401 || error.name === 'UnauthorizedError') {
    return ctx.unauthorized(error.message || 'Unauthorized');
  }

  // Handle forbidden errors
  if (error.statusCode === 403 || error.name === 'ForbiddenError') {
    return ctx.forbidden(error.message || 'Forbidden');
  }

  // Default: internal server error
  return ctx.badRequest(`Failed to ${operation}`);
}

/**
 * Async error handler wrapper for controller methods
 * @param {Function} fn - Async controller function
 * @param {string} operation - Operation description
 * @returns {Function} Wrapped function with error handling
 */
function withErrorHandling(fn, operation) {
  return async (ctx) => {
    try {
      await fn(ctx);
    } catch (error) {
      handleControllerError(ctx, error, operation, strapi);
    }
  };
}

module.exports = {
  handleControllerError,
  withErrorHandling,
  isValidationError,
};
