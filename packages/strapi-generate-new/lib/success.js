'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const os = require('os');
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
        error,
        os: os.type()
      }
    })
    .on('error', () => {});
};
