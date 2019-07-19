'use strict';

const os = require('os');
const fetch = require('node-fetch');

function trackEvent(event, body) {
  try {
    return fetch('https://analytics.strapi.io/track', {
      method: 'POST',
      body: JSON.stringify({
        event,
        ...body,
      }),
      timeout: 1000,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  } catch (err) {
    /** ignore errors*/
    return Promise.resolve();
  }
}

function trackError({ scope, error }) {
  try {
    return trackEvent('didNotCreateProject', {
      uuid: scope.uuid,
      deviceId: scope.deviceId,
      properties: {
        error: typeof error == 'string' ? error : error && error.message,
        os: os.type(),
        version: scope.strapiVersion,
      },
    });
  } catch (err) {
    /** ignore errors*/
    return Promise.resolve();
  }
}

function trackUsage({ event, scope, error }) {
  try {
    return trackEvent(event, {
      uuid: scope.uuid,
      deviceId: scope.deviceId,
      properties: {
        error: typeof error == 'string' ? error : error && error.message,
        os: os.type(),
        version: scope.strapiVersion,
      },
    });
  } catch (err) {
    /** ignore errors*/
    return Promise.resolve();
  }
}

module.exports = {
  trackError,
  trackUsage,
};
