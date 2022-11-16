'use strict';

const os = require('os');
const _ = require('lodash');
const { map, get, values, isEqual, sumBy, sum } = require('lodash/fp');
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

const getNumberOfDynamicZones = () =>
  sum(
    map(
      (ct) => sumBy(isEqual('dynamiczone'), map(get('type'), values(get('attributes', ct)))),
      strapi.contentTypes
    )
  );

const getProperties = (scope, error) => ({
  error: typeof error === 'string' ? error : error && error.message,
  os: os.type(),
  osPlatform: os.platform(),
  osArch: os.arch(),
  osRelease: os.release(),
  version: scope.strapiVersion,
  nodeVersion: process.versions.node,
  docker: scope.docker,
  useYarn: scope.useYarn,
  useTypescriptOnServer: scope.useTypescript,
  useTypescriptOnAdmin: scope.useTypescript,
  isHostedOnStrapiCloud: process.env.STRAPI_HOSTING === 'strapi.cloud',
  noRun: (scope.runQuickstartApp !== true).toString(),
  numberOfContentTypes: _.size(strapi.contentTypes),
  numberOfComponents: _.size(strapi.components),
  numberOfDynamicZones: getNumberOfDynamicZones(),
});

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
  const properties = getProperties(scope, error);

  try {
    return trackEvent('didNotCreateProject', {
      uuid,
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
  const properties = getProperties(scope, error);

  try {
    return trackEvent(event, {
      uuid,
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
