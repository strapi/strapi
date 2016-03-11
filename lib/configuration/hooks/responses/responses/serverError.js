'use strict';

/**
 * Default `serverError` response.
 */

module.exports = function * serverError(data) {
  // Set the status.
  this.status = 500;

  // Delete the `data` object if the app is used in production environment.
  if (strapi.config.environment === 'production') {
    data = undefined;
  }

  // Finally send the response.
  this.body = data;
};
