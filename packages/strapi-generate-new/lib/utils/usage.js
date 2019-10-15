'use strict';

const os = require('os');
const fetch = require('node-fetch');
const sentry = require('@sentry/node');

async function captureException(error) {
  try {
    sentry.captureException(error);
    await sentry.flush();
  } catch (err) {
    /** ignore errors*/
    return Promise.resolve();
  }
}

async function captureError(message) {
  try {
    sentry.captureMessage(message, 'error');
    await sentry.flush();
  } catch (err) {
    /** ignore errors*/
    return Promise.resolve();
  }
}

function captureStderr(name, error) {
  if (error && error.stderr && error.stderr.trim() !== '') {
    error.stderr
      .trim()
      .split('\n')
      .forEach(line => {
        sentry.addBreadcrumb({
          category: 'stderr',
          message: line,
          level: 'error',
        });
      });
  }

  return captureError(name);
}

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
        platform: os.platform(),
        release: os.release(),
        version: scope.strapiVersion,
        nodeVersion: process.version,
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
        os_platform: os.platform(),
        os_release: os.release(),
        node_version: process.version,
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
  captureException,
  captureStderr,
};
