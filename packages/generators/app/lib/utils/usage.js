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

function trackEvent(event, body) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

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
    /** ignore errors */
    return Promise.resolve();
  }
}

function trackError({ scope, error }) {
  const { uuid } = scope;

  const properties = {
    error: typeof error === 'string' ? error : error && error.message,
    os: os.type(),
    platform: os.platform(),
    release: os.release(),
    version: scope.strapiVersion,
    nodeVersion: process.version,
    docker: scope.docker,
    useYarn: scope.useYarn,
    useTypescriptOnServer: scope.useTypescript,
    useTypescriptOnAdmin: scope.useTypescript,
    projectId: uuid,
  };

  try {
    return trackEvent('didNotCreateProject', {
      deviceId: scope.deviceId,
      properties: addPackageJsonStrapiMetadata(properties, scope),
    });
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

function trackUsage({ event, scope, error }) {
  const { uuid } = scope;

  const properties = {
    error: typeof error === 'string' ? error : error && error.message,
    os: os.type(),
    os_arch: os.arch(),
    os_platform: os.platform(),
    os_release: os.release(),
    node_version: process.version,
    version: scope.strapiVersion,
    docker: scope.docker,
    useYarn: scope.useYarn.toString(),
    useTypescriptOnServer: scope.useTypescript,
    useTypescriptOnAdmin: scope.useTypescript,
    noRun: (scope.runQuickstartApp !== true).toString(),
    projectId: uuid,
  };

  try {
    return trackEvent(event, {
      deviceId: scope.deviceId,
      properties: addPackageJsonStrapiMetadata(properties, scope),
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
