import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  EDITION_ENV_VAR,
  editionEnv,
  editionFromEnv,
  generateApp,
  getInstanceFeatures,
  requireFeatures,
  scaffoldConfig,
  startServer,
  stopAllServers,
  type App,
  type Server,
} from '@strapi/tests-shared';
import { describeEE, describeIfFeature } from '@strapi/tests-shared/vitest';

import { port, worker } from '../helpers';

/** The edition contract (RFC D6). The suite runs in the edition of STRAPI_TEST_EDITION. */

describe('editionFromEnv', () => {
  test('defaults to CE', () => {
    expect(editionFromEnv({})).toBe('ce');
  });

  test('EE without a license is a hard failure, not a CE fallback', () => {
    expect(() => editionFromEnv({ [EDITION_ENV_VAR]: 'ee' })).toThrow('needs a STRAPI_LICENSE');
    expect(editionFromEnv({ [EDITION_ENV_VAR]: 'ee', STRAPI_LICENSE: 'key' })).toBe('ee');
  });

  test('rejects an unknown edition', () => {
    expect(() => editionFromEnv({ [EDITION_ENV_VAR]: 'enterprise' })).toThrow(
      'must be "ce" or "ee"'
    );
  });
});

describe('editionEnv', () => {
  test('CE turns EE off and drops a license from the shell', () => {
    expect(editionEnv('ce', { STRAPI_LICENSE: 'key' })).toEqual({
      STRAPI_DISABLE_EE: 'true',
      STRAPI_LICENSE: '',
    });
  });

  test('EE passes the license on', () => {
    expect(editionEnv('ee', { STRAPI_LICENSE: 'key' })).toEqual({
      STRAPI_DISABLE_EE: 'false',
      STRAPI_LICENSE: 'key',
    });
  });
});

describe('the instance', () => {
  let app: App;
  let server: Server;

  beforeAll(async () => {
    app = await generateApp({ name: `api-edition-${worker}` });
    scaffoldConfig(app, 'features', { future: { testsFlag: true } });
    server = await startServer(app, { port });
  });

  afterAll(async () => {
    await stopAllServers();
  });

  test('runs in the edition of the run, read from the instance', async () => {
    const features = await getInstanceFeatures(server);
    expect(features.edition).toBe(editionFromEnv());
    expect(server.edition).toBe(editionFromEnv());
    if (features.edition === 'ce') {
      expect(features.ee).toEqual([]);
    }
  });

  test('reports the future flags that are on', async () => {
    const features = await getInstanceFeatures(server);
    expect(features.future).toContain('testsFlag');
    expect(() => requireFeatures(features, { future: ['testsFlag'] })).not.toThrow();
  });

  test('a missing feature or flag fails instead of skipping', async () => {
    const features = await getInstanceFeatures(server);
    expect(() => requireFeatures(features, { future: ['nope'] })).toThrow(
      'needs future flag "nope"'
    );
    expect(() => requireFeatures(features, { ee: ['nope'] })).toThrow('needs EE feature "nope"');
  });

  describeEE('EE-only block', () => {
    test('runs only in EE runs', () => {
      expect(editionFromEnv()).toBe('ee');
    });
  });

  describeIfFeature(
    'cms-content-releases',
    () => server,
    'feature-gated block',
    () => {
      test('runs only in EE runs, on an instance with the feature', () => {
        expect(editionFromEnv()).toBe('ee');
      });
    }
  );
});

describe('the license', () => {
  afterAll(async () => {
    await stopAllServers();
  });

  test('an EE run whose license Strapi rejects fails instead of running as CE', async () => {
    const license = process.env.STRAPI_LICENSE;
    process.env.STRAPI_LICENSE = 'not-a-license';
    try {
      const app = await generateApp({ name: `api-edition-${worker}`, overwrite: false });
      await expect(startServer(app, { port, edition: 'ee' })).rejects.toThrow(
        'Strapi booted as CE in an EE run'
      );
    } finally {
      process.env.STRAPI_LICENSE = license;
      if (license === undefined) {
        delete process.env.STRAPI_LICENSE;
      }
    }
  });
});
