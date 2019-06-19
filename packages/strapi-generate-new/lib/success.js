'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const os = require('os');
const fetch = require('node-fetch');

module.exports = function recordUsage(event, scope, error) {
  return fetch('https://analytics.strapi.io/track', {
    method: 'POST',
    body: JSON.stringify({
      event,
      uuid: scope.uuid,
      deviceId: scope.deviceId,
      properties: {
        error: typeof error == 'string' ? error : error && error.message,
        os: os.type(),
        version: scope.strapiPackageJSON.version,
      },
    }),
    timeout: 1000,
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {});

  // request
  //   .post('https://analytics.strapi.io/track')
  //   .form({
  //     event,
  //     uuid: scope.uuid,
  //     deviceId: machineIdSync(),
  //     properties: {
  //       error,
  //       os: os.type()
  //     }
  //   })
  //   .on('error', () => {});
};
