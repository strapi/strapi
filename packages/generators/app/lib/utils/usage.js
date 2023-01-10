'use strict';

const os = require('os');
const _ = require('lodash');
const fetch = require('node-fetch');
const sentry = require('@sentry/node');

/**
 * Add properties from the package.json strapi key in the metadata
 * @param {object} metadata
 * @param {object} scope
 */
function addPackageJsonStrapiMetadata(metadata, scope) {
  const { packageJsonStrapi = {} } = scope;

  return _.defaults(metadata, packageJsonStrapi);
}

async function captureException(error) {
  try {
    sentry.captureException(error);
    await sentry.flush();
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

async function captureError(message) {
  try {
    sentry.captureMessage(message, 'error');
    await sentry.flush();
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

function captureStderr(name, error) {
  if (error && error.stderr && error.stderr.trim() !== '') {
    error.stderr
      .trim()
      .split('\n')
      .forEach((line) => {
        sentry.addBreadcrumb({
          category: 'stderr',
          message: line,
          level: 'error',
        });
      });
  }

  return captureError(name);
}

const getProperties = (scope, error) => {
  const eventProperties = {
    error: typeof error === 'string' ? error : error && error.message,
  };
  const userProperties = {
    os: os.type(),
    osPlatform: os.platform(),
    osArch: os.arch(),
    osRelease: os.release(),
    nodeVersion: process.versions.node,
  };
  const groupProperties = {
    version: scope.strapiVersion,
    docker: scope.docker,
    useYarn: scope.useYarn,
    useTypescriptOnServer: scope.useTypescript,
    useTypescriptOnAdmin: scope.useTypescript,
    isHostedOnStrapiCloud: process.env.STRAPI_HOSTING === 'strapi.cloud',
    noRun: (scope.runQuickstartApp !== true).toString(),
    projectId: scope.uuid,
  };

  return {
    eventProperties,
    userProperties,
    groupProperties: addPackageJsonStrapiMetadata(groupProperties, scope),
  };
};

function trackEvent(event, payload) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    return fetch('https://analytics.strapi.io/api/v2/track', {
      method: 'POST',
      body: JSON.stringify({
        event,
        ...payload,
      }),
      timeout: 1000,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

function trackError({ scope, error }) {
  const properties = getProperties(scope, error);

  try {
    return trackEvent('didNotCreateProject', {
      deviceId: scope.deviceId,
      ...properties,
    });
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

function trackUsage({ event, scope, error }) {
  const properties = getProperties(scope, error);

  try {
    return trackEvent(event, {
      deviceId: scope.deviceId,
      ...properties,
    });
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

module.exports = {
  trackError,
  trackUsage,
  captureException,
  captureStderr,
};
