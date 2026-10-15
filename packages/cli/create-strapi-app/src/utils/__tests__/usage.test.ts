import { trackUsage } from '../usage';

import type { Scope } from '../../types';

const scope = {
  name: 'test-app',
  rootPath: '/tmp/test-app',
  packageManager: 'npm',
  database: { client: 'sqlite' },
  installId: 'install-id',
  shouldCreateGrowthSsoTrial: false,
} satisfies Scope;

describe('trackUsage', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTelemetry = process.env.STRAPI_TELEMETRY_DISABLED;

  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response());
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;

    if (originalTelemetry === undefined) {
      delete process.env.STRAPI_TELEMETRY_DISABLED;
    } else {
      process.env.STRAPI_TELEMETRY_DISABLED = originalTelemetry;
    }

    jest.restoreAllMocks();
  });

  it('does not track when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.STRAPI_TELEMETRY_DISABLED;

    await trackUsage({ event: 'willCreateProject', scope });

    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['true', '1', 'TRUE'])(
    'does not track when STRAPI_TELEMETRY_DISABLED is %s',
    async (value) => {
      process.env.NODE_ENV = 'production';
      process.env.STRAPI_TELEMETRY_DISABLED = value;

      await trackUsage({ event: 'willCreateProject', scope });

      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it('tracks when telemetry is not disabled outside of test', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STRAPI_TELEMETRY_DISABLED = 'false';

    await trackUsage({ event: 'willCreateProject', scope });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
