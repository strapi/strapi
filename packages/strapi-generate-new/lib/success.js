'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const request = require('request');

module.exports = function trackSuccess(event, scope) {
  request
    .post('https://analytics.strapi.io/track')
    .form({
      event,
      uuid: scope.uuid
    })
    .on('error', () => {});
};
