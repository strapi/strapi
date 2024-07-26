import os from 'os';
import _ from 'lodash';

import { Scope, StderrError } from '../types';

type TrackError = Error | string | StderrError;

// Add properties from the package.json strapi key in the metadata
function addPackageJsonStrapiMetadata(metadata: Record<string, unknown>, scope: Scope) {
  const { packageJsonStrapi = {} } = scope;

  return _.defaults(metadata, packageJsonStrapi);
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
    useYarn: scope.packageManager === 'yarn',
    useTypescriptOnServer: scope.useTypescript,
    useTypescriptOnAdmin: scope.useTypescript,
    isHostedOnStrapiCloud: process.env.STRAPI_HOSTING === 'strapi.cloud',
    noRun: (scope.runApp !== true).toString(),
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
      signal: AbortSignal.timeout(1000),
      headers: {
        'Content-Type': 'application/json',
        'X-Strapi-Event': event,
      },
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
