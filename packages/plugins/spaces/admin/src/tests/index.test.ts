import { FEATURE_ID } from '../constants';
import { addSpaceColumnHook } from '../contentManagerHooks/listView';
import plugin from '../index';

/** A stand-in for the admin application, recording what the plugin asked of it. */
const makeApp = () => {
  const calls: Record<string, unknown[]> = {
    addMiddlewares: [],
    addReducers: [],
    registerPlugin: [],
    injectAdminComponent: [],
    registerHook: [],
    addSettingsLink: [],
  };

  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls[name].push(args);
    };

  return {
    calls,
    app: {
      addMiddlewares: record('addMiddlewares'),
      addReducers: record('addReducers'),
      registerPlugin: record('registerPlugin'),
      injectAdminComponent: record('injectAdminComponent'),
      registerHook: record('registerHook'),
      addSettingsLink: record('addSettingsLink'),
    } as never,
  };
};

const setLicence = (licensed: boolean) => {
  (window as { strapi?: unknown }).strapi = {
    features: { isEnabled: (name: string) => licensed && name === FEATURE_ID },
  };
};

describe('what the admin plugin registers', () => {
  const original = (window as { strapi?: unknown }).strapi;

  afterEach(() => {
    (window as { strapi?: unknown }).strapi = original;
  });

  describe('with the licence feature', () => {
    beforeEach(() => setLicence(true));

    it('registers itself, so its screens can be reached', () => {
      const { app, calls } = makeApp();

      plugin.register(app);

      expect(calls.registerPlugin).toHaveLength(1);
    });

    it('puts the space switcher in the navigation', () => {
      const { app, calls } = makeApp();

      plugin.bootstrap(app);

      expect(calls.injectAdminComponent[0]).toMatchObject([
        'navigation',
        'top',
        { name: 'spaces-switcher' },
      ]);
    });

    it('adds the Space column to the content list', () => {
      const { app, calls } = makeApp();

      plugin.bootstrap(app);

      expect(calls.registerHook[0]).toEqual([
        'Admin/CM/pages/ListView/inject-column-in-table',
        addSpaceColumnHook,
      ]);
    });

    it('puts its settings behind the read permission', () => {
      const { app, calls } = makeApp();

      plugin.bootstrap(app);

      expect(calls.addSettingsLink[0]).toMatchObject([
        'global',
        { id: 'spaces', permissions: [{ action: 'plugin::spaces.spaces.read' }] },
      ]);
    });
  });

  describe('without it', () => {
    beforeEach(() => setLicence(false));

    it('registers nothing at all', () => {
      // The routes behind these screens are not registered either, so a
      // settings link would only lead somewhere broken.
      const { app, calls } = makeApp();

      plugin.register(app);
      plugin.bootstrap(app);

      expect(Object.values(calls).flat()).toEqual([]);
    });

    it('registers nothing when the admin knows of no features at all', () => {
      (window as { strapi?: unknown }).strapi = undefined;
      const { app, calls } = makeApp();

      plugin.register(app);
      plugin.bootstrap(app);

      expect(Object.values(calls).flat()).toEqual([]);
    });
  });

  describe('its translations', () => {
    it('are namespaced, so they cannot collide with another plugin’s', async () => {
      const [english] = await plugin.registerTrads({ locales: ['en'] });

      expect(Object.keys(english.data).every((key) => key.startsWith('spaces.'))).toBe(true);
      expect(Object.keys(english.data).length).toBeGreaterThan(0);
    });

    it('are empty for a locale that has none, rather than failing to load', async () => {
      const [klingon] = await plugin.registerTrads({ locales: ['tlh'] });

      expect(klingon).toEqual({ data: {}, locale: 'tlh' });
    });
  });
});
