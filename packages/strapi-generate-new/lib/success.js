'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const request = require('request');
const { machineIdSync } = require('node-machine-id');

module.exports = function trackSuccess(event, scope, error) {
  request
    .post('https://analytics.strapi.io/track')
    .form({
      event,
      uuid: scope.uuid,
      deviceId: machineIdSync(),
      properties: {
        error
      }
    })
    .on('error', () => {});
};
