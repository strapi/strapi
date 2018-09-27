'use strict';

/**
 * Default `send` response.
 */

module.exports = function sendOk(data) {

  // Set the status.
  this.status = 200;

  // Finally send the response.
  this.body = data;
};
