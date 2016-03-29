'use strict';

/**
 * Default `forbidden` response.
 */

module.exports = function forbidden(data) {

  // Set the status.
  this.status = 403;

  // Delete the `data` object if the app is used in production environment.
  if (strapi.config.environment === 'production') {
    data = '';
  }

  // Finally send the response.
  this.body = data;
};
