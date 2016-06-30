'use strict';

/**
 * Default `notFound` response.
 */

module.exports = function notFound(data) {

  // Set the status.
  this.status = 404;

  // Delete the `data` object if the app is used in production environment.
  if (strapi.config.environment === 'production') {
    data = '';
  }

  // Finally send the response.
  this.body = data;
};
