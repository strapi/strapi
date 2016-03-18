'use strict';

/**
 * Default `created` response.
 */

module.exports = function created(data) {

  // Set the status.
  this.status = 201;

  // Finally send the response.
  this.body = data;
};
