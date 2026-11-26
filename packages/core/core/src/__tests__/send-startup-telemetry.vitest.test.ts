import { describe, expect, it, vi } from 'vitest';

import Strapi from '../Strapi';
import { createConfigProvider } from '../services/config';

vi.mock('../services/utils/dynamic-zones', () => ({ default: () => 0 }));
vi.mock('../services/utils/conditional-fields', () => ({ default: () => 0 }));

const sendStartupTelemetry = (config: ReturnType<typeof createConfigProvider>) => {
  const send = vi.fn().mockResolvedValue(true);
  const fake = {
    config,
    telemetry: { send },
    plugins: {},
    contentTypes: {},
    components: {},
    controllers: {},
    log: { error: vi.fn() },
  };

  Strapi.prototype.sendStartupTelemetry.call(fake as unknown as Strapi);

  return send;
};

describe('Strapi.sendStartupTelemetry', () => {
  it('sends the environment and database client from the config', () => {
    const send = sendStartupTelemetry(
      createConfigProvider({
        environment: 'staging',
        database: { connection: { client: 'sqlite' } },
      })
    );

    expect(send).toHaveBeenCalledWith('didStartServer', {
      groupProperties: expect.objectContaining({ environment: 'staging', database: 'sqlite' }),
    });
  });

  it('sends an environment written with set after the config was created', () => {
    const config = createConfigProvider({ environment: 'development' });
    config.set('environment', 'staging');

    const send = sendStartupTelemetry(config);

    expect(send).toHaveBeenCalledWith('didStartServer', {
      groupProperties: expect.objectContaining({ environment: 'staging' }),
    });
  });
});
