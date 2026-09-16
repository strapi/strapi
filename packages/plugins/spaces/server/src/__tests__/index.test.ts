import { ENABLE_ENV_VAR, LICENSE_FEATURE } from '../../../shared/constants';

/**
 * The plugin decides what to install at import time, so each case needs the
 * module loaded again against a different licence.
 */
const loadPlugin = ({ isEE = true, licensed = false }: { isEE?: boolean; licensed?: boolean }) => {
  let plugin: Record<string, unknown> = {};

  jest.isolateModules(() => {
    (global as { strapi?: unknown }).strapi = {
      ee: {
        isEE,
        features: { isEnabled: (name: string) => licensed && name === LICENSE_FEATURE },
      },
      plugins: {},
    };

    /* eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require, global-require --
       `jest.isolateModules` is synchronous, so the module has to come in by
       require; the plugin decides what to install as it is evaluated. */
    plugin = require('../index').default;
  });

  return plugin;
};

describe('what the plugin installs', () => {
  const originalStrapi = (global as { strapi?: unknown }).strapi;
  const originalEnv = process.env[ENABLE_ENV_VAR];

  beforeEach(() => {
    delete process.env[ENABLE_ENV_VAR];
  });

  afterAll(() => {
    if (originalStrapi) {
      (global as { strapi?: unknown }).strapi = originalStrapi;
    }

    if (originalEnv !== undefined) {
      process.env[ENABLE_ENV_VAR] = originalEnv;
    }
  });

  describe('when the feature is on', () => {
    it('installs the enforcement, the endpoints and the services', () => {
      const plugin = loadPlugin({ licensed: true });

      expect(Object.keys(plugin).sort()).toEqual([
        'bootstrap',
        'config',
        'contentTypes',
        'controllers',
        'destroy',
        'register',
        'routes',
        'services',
      ]);
    });
  });

  describe('when it is off', () => {
    it('still registers the schema, so the columns survive a lapsed licence', () => {
      // Schema sync removes columns it is not told about. Losing this one would
      // merge every tenant's data together, which no licence check should do.
      const plugin = loadPlugin({ licensed: false });

      expect(plugin.register).toBeDefined();
      expect(plugin.contentTypes).toBeDefined();
    });

    it('exposes no endpoints and no services', () => {
      const plugin = loadPlugin({ licensed: false });

      expect(plugin.routes).toBeUndefined();
      expect(plugin.controllers).toBeUndefined();
      expect(plugin.services).toBeUndefined();
    });

    it('bootstraps only the part that keeps the column out of sight', () => {
      const plugin = loadPlugin({ licensed: false });
      const enabled = loadPlugin({ licensed: true });

      expect(plugin.bootstrap).toBeDefined();
      expect(plugin.bootstrap).not.toBe(enabled.bootstrap);
    });

    it('is off for a Community project whatever the environment says', () => {
      process.env[ENABLE_ENV_VAR] = 'true';

      expect(loadPlugin({ isEE: false }).routes).toBeUndefined();
    });
  });
});
