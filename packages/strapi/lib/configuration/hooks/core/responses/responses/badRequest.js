'use strict';

/**
 * Default `badRequest` response.
 */

module.exports = function badRequest(data) {

  // Set the status.
  this.status = 400;

  // Delete the `data` object if the app is used in production environment.
  if (strapi.config.environment === 'production') {
    data = '';
  }

  // Finally send the response.
  this.body = data;
};
