import { afterEach, describe, expect, it, vi } from 'vitest';

import Strapi from '../Strapi';

describe('Strapi.destroy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is idempotent while retaining logger and telemetry after release', async () => {
    const logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn() };
    const telemetry = { destroy: vi.fn(), send: vi.fn() };
    const modules = { destroy: vi.fn() };
    const instance = Object.create(Strapi.prototype) as Strapi;
    const services = {
      ai: { mcp: { isRunning: vi.fn().mockReturnValue(false), stop: vi.fn() } },
      cron: { destroy: vi.fn() },
      db: { destroy: vi.fn() },
      eventHub: { destroy: vi.fn() },
      logger,
      modules,
      server: { destroy: vi.fn() },
      telemetry,
    };

    Object.assign(instance, {
      add: vi.fn(),
      app: undefined,
      destroyed: false,
      get: vi.fn((name: keyof typeof services) => services[name]),
      has: vi.fn((name: string) => name === 'telemetry'),
      release: vi.fn(),
      runUserLifecycles: vi.fn(),
    });
    vi.spyOn(process, 'removeAllListeners').mockImplementation(() => process);

    await instance.destroy();
    await instance.destroy();

    expect(modules.destroy).toHaveBeenCalledTimes(1);
    expect(services.cron.destroy).toHaveBeenCalledTimes(1);
    expect(services.server.destroy).toHaveBeenCalledTimes(1);
    expect(services.eventHub.destroy).toHaveBeenCalledTimes(1);
    expect(services.db.destroy).toHaveBeenCalledTimes(1);
    expect(instance.release).toHaveBeenCalledTimes(1);
    expect(instance.add).toHaveBeenCalledWith('logger', logger);
    expect(instance.add).toHaveBeenCalledWith('telemetry', telemetry);
  });
});
