import { trackUsage } from '../usage';

import type { Scope } from '../../types';

const scope = {
  packageManager: 'npm',
  database: { client: 'sqlite' },
  shouldCreateGrowthSsoTrial: false,
  installId: 'test-install-id',
} as Scope;

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

  it('does not send when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.STRAPI_TELEMETRY_DISABLED;

    await trackUsage({ event: 'willCreateProject', scope });

    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['true', '1', 'TRUE'])(
    'does not send when STRAPI_TELEMETRY_DISABLED is %s',
    async (value) => {
      process.env.NODE_ENV = 'development';
      process.env.STRAPI_TELEMETRY_DISABLED = value;

      await trackUsage({ event: 'willCreateProject', scope });

      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it('sends when telemetry is not disabled', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.STRAPI_TELEMETRY_DISABLED;

    await trackUsage({ event: 'willCreateProject', scope });

    expect(fetch).toHaveBeenCalled();
  });

  it.each(['false', '0'])('sends when STRAPI_TELEMETRY_DISABLED is %s', async (value) => {
    process.env.NODE_ENV = 'development';
    process.env.STRAPI_TELEMETRY_DISABLED = value;

    await trackUsage({ event: 'willCreateProject', scope });

    expect(fetch).toHaveBeenCalled();
  });
});
