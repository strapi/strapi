import { afterEach, describe, expect, it, vi } from 'vitest';

import bootstrap from '../bootstrap';

function setup(values = {}, settings = {}) {
  const stored = { grant: {}, email: {}, advanced: {}, ...values };
  const pluginStore = {
    get: vi.fn(async ({ key }) => stored[key]),
    set: vi.fn(async ({ key, value }) => {
      stored[key] = value;
    }),
  };
  const initialize = vi.fn();
  const services = {
    'providers-registry': {
      getAll: () => ({
        local: { icon: 'mail', enabled: true, grantConfig: { callback: '/callback' } },
      }),
    },
    'users-permissions': { initialize },
  };
  const config = { jwtSecret: 'secret', ...settings };
  const strapi = {
    plugin: () => ({ service: (name) => services[name] }),
    store: () => pluginStore,
    service: () => ({ actionProvider: { registerMany: vi.fn() } }),
    config: {
      get: vi.fn(
        (key) =>
          ({
            'plugin::users-permissions': config,
            'plugin::users-permissions.jwtSecret': config.jwtSecret,
            'admin.auth.secret': 'admin-secret',
          })[key]
      ),
      set: vi.fn(),
    },
    sessionManager: { defineOrigin: vi.fn() },
    fs: { appendFile: vi.fn() },
    log: { info: vi.fn() },
  };
  global.strapi = strapi;
  return { strapi, pluginStore, stored, initialize };
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete global.strapi;
});

describe('users-permissions bootstrap', () => {
  it('preserves configured provider secrets and initializes missing stores', async () => {
    const { strapi, stored, initialize } = setup({
      grant: { local: { enabled: false, secret: 'configured' } },
      email: undefined,
      advanced: undefined,
    });
    await bootstrap({ strapi });
    expect(stored.grant.local).toEqual({
      icon: 'mail',
      enabled: false,
      callback: '/callback',
      secret: 'configured',
    });
    expect(stored.email).toHaveProperty('reset_password.options.message');
    expect(stored.advanced).toMatchObject({ allow_register: true, unique_email: true });
    expect(initialize).toHaveBeenCalledOnce();
    expect(strapi.sessionManager.defineOrigin).toHaveBeenCalledWith(
      'users-permissions',
      expect.objectContaining({ jwtSecret: 'secret', accessTokenLifespan: 600 })
    );
  });

  it('keeps existing email and advanced configuration', async () => {
    const { strapi, stored, pluginStore } = setup({
      email: { custom: true },
      advanced: { allow_register: false },
    });
    await bootstrap({ strapi });
    expect(stored.email).toEqual({ custom: true });
    expect(stored.advanced).toEqual({ allow_register: false });
    expect(pluginStore.set.mock.calls.every(([arg]) => arg.key === 'grant')).toBe(true);
  });

  it('rejects missing signing secrets outside development', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { strapi } = setup({}, { jwtSecret: undefined });
    await expect(bootstrap({ strapi })).rejects.toThrow('Missing jwtSecret');
    expect(strapi.fs.appendFile).not.toHaveBeenCalled();
  });

  it('generates and persists a development secret', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('JWT_SECRET', undefined);
    vi.stubEnv('ENV_PATH', '.env.test');
    const { strapi } = setup({}, { jwtSecret: undefined });
    await bootstrap({ strapi });
    const [[key, secret]] = strapi.config.set.mock.calls;
    expect(key).toBe('plugin::users-permissions.jwtSecret');
    expect(Buffer.from(secret, 'base64')).toHaveLength(16);
    expect(strapi.fs.appendFile).toHaveBeenCalledWith('.env.test', `JWT_SECRET=${secret}\n`);
  });
});
