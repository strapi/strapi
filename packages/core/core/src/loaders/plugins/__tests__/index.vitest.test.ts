import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import loadPlugins from '../index';

const { pluginServers } = vi.hoisted(() => ({
  pluginServers: {} as Record<string, Record<string, unknown>>,
}));

vi.mock('../get-enabled-plugins', () => ({
  getEnabledPlugins: async () =>
    Object.fromEntries(
      Object.keys(pluginServers).map((name) => [
        name,
        { packageInfo: {}, pathToPlugin: `/plugins/${name}` },
      ])
    ),
}));

vi.mock('../get-user-plugins-config', () => ({
  getUserPluginsConfig: async () => ({}),
}));

vi.mock('../../../utils/load-config-file', () => ({
  loadConfigFile(path: string) {
    const name = path.split('/')[2];
    return pluginServers[name];
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    // Plugin entrypoints exist, the extensions folder does not
    pathExists: async (path: string) => path.startsWith('/plugins/'),
  },
}));

const createStrapi = () => {
  const loaded: Record<string, { routes: unknown }> = {};

  const strapi = {
    dirs: { dist: { extensions: '/app/dist/src/extensions' } },
    config: { set: () => undefined },
    get: () => ({
      add(name: string, plugin: { routes: unknown }) {
        loaded[name] = plugin;
      },
    }),
  };

  return { strapi, loaded };
};

describe('loadPlugins', () => {
  beforeEach(() => {
    for (const name of Object.keys(pluginServers)) {
      delete pluginServers[name];
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives each route-less plugin its own routes array', async () => {
    pluginServers.alpha = {};
    pluginServers.beta = {};
    const { strapi, loaded } = createStrapi();
    vi.stubGlobal('strapi', strapi);

    await loadPlugins(strapi as unknown as Core.Strapi);

    expect(loaded.alpha.routes).toEqual([]);
    expect(loaded.beta.routes).toEqual([]);
    expect(loaded.alpha.routes).not.toBe(loaded.beta.routes);

    (loaded.alpha.routes as unknown[]).push({ method: 'GET', path: '/alpha' });

    expect(loaded.alpha.routes).toHaveLength(1);
    expect(loaded.beta.routes).toEqual([]);
  });

  it('keeps the routes a plugin declares', async () => {
    const routes = [{ method: 'GET', path: '/gamma' }];
    pluginServers.gamma = { routes };
    const { strapi, loaded } = createStrapi();
    vi.stubGlobal('strapi', strapi);

    await loadPlugins(strapi as unknown as Core.Strapi);

    expect(loaded.gamma.routes).toBe(routes);
  });
});
