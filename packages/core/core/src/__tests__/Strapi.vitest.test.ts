import { afterEach, describe, expect, it, vi } from 'vitest';

import Strapi from '../Strapi';

describe('Strapi.destroy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns on a second call and leaves the container in place', async () => {
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
    expect(instance.release).not.toHaveBeenCalled();
    expect(instance.add).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Strapi has been shut down');
  });

  it('shares an in-flight destroy and retries the step that failed', async () => {
    const logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn() };
    const telemetry = { destroy: vi.fn(), send: vi.fn() };
    const modules = { destroy: vi.fn() };
    const instance = Object.create(Strapi.prototype) as Strapi;
    let rejectDb: (error: Error) => void = () => undefined;
    let dbCalls = 0;
    const db = {
      destroy: vi.fn(
        () =>
          new Promise<void>((resolve, reject) => {
            dbCalls += 1;
            if (dbCalls === 1) {
              rejectDb = reject;
              return;
            }
            resolve();
          })
      ),
    };
    const services = {
      ai: { mcp: { isRunning: vi.fn().mockReturnValue(false), stop: vi.fn() } },
      cron: { destroy: vi.fn() },
      db,
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

    const first = instance.destroy();
    const second = instance.destroy();
    await vi.waitFor(() => {
      expect(db.destroy).toHaveBeenCalledTimes(1);
    });
    expect(modules.destroy).toHaveBeenCalledTimes(1);

    rejectDb(new Error('db closed badly'));
    await expect(first).rejects.toThrow('db closed badly');
    await expect(second).rejects.toThrow('db closed badly');

    await instance.destroy();
    expect(modules.destroy).toHaveBeenCalledTimes(1);
    expect(db.destroy).toHaveBeenCalledTimes(2);
    expect(instance.release).not.toHaveBeenCalled();
    expect(instance.add).not.toHaveBeenCalled();
  });
});
