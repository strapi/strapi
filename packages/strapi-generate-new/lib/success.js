'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const os = require('os');
const request = require('request');
const { machineIdSync } = require('node-machine-id');

module.exports = function trackSuccess(event, scope, error) {
  try {
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
  } catch(e) {
    // do not fail to install if installation tracker is not working,
    // perhaps because regedit rights are not available
    // you may want to make this optional as well or skippable
    // via a documented parameter
  }
};
