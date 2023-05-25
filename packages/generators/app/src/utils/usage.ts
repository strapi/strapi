import os from 'os';
import _ from 'lodash';
import fetch from 'node-fetch';
import sentry, { Severity } from '@sentry/node';
import { Scope, StderrError, isStderrError } from '../types';

type TrackError = Error | string | StderrError;

// Add properties from the package.json strapi key in the metadata
function addPackageJsonStrapiMetadata(metadata: Record<string, unknown>, scope: Scope) {
  const { packageJsonStrapi = {} } = scope;

  return _.defaults(metadata, packageJsonStrapi);
}

export async function captureException(error: Error) {
  try {
    sentry.captureException(error);
    await sentry.flush();
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

async function captureError(message: string) {
  try {
    sentry.captureMessage(message, Severity.Error);
    await sentry.flush();
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

export function captureStderr(name: string, error: unknown) {
  if (isStderrError(error) && error.stderr.trim() !== '') {
    error.stderr
      .trim()
      .split('\n')
      .forEach((line) => {
        sentry.addBreadcrumb({
          category: 'stderr',
          message: line,
          level: Severity.Error,
        });
      });
  }

  return captureError(name);
}

const getProperties = (scope: Scope, error?: TrackError) => {
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

function trackEvent(event: string, payload: Record<string, unknown>) {
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

export async function trackError({ scope, error }: { scope: Scope; error?: TrackError }) {
  const properties = getProperties(scope, error);

  try {
    return await trackEvent('didNotCreateProject', {
      deviceId: scope.deviceId,
      ...properties,
    });
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}

export async function trackUsage({
  event,
  scope,
  error,
}: {
  event: string;
  scope: Scope;
  error?: TrackError;
}) {
  const properties = getProperties(scope, error);

  try {
    return await trackEvent(event, {
      deviceId: scope.deviceId,
      ...properties,
    });
  } catch (err) {
    /** ignore errors */
    return Promise.resolve();
  }
}
