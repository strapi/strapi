import { join } from 'path';

import loadPolicies, { loadPoliciesFromDir } from '../policies';
import loadMiddlewares, { loadLocalMiddlewaresFromDir } from '../middlewares';
import loadSrcIndex, { loadSrcIndexFromDir } from '../src-index';
import loadAPIs, { loadAPIsFromDir } from '../apis';

const RESOURCES = join(__dirname, 'resources');

const createRegistry = () => ({ add: jest.fn() });

const createStrapi = (dirs: Record<string, string> = {}) => {
  const registries: Record<string, ReturnType<typeof createRegistry>> = {
    policies: createRegistry(),
    middlewares: createRegistry(),
    apis: createRegistry(),
  };

  return {
    app: undefined as unknown,
    dirs: { dist: dirs, app: dirs },
    get: jest.fn((name: string) => registries[name]),
    stopWithError: jest.fn(),
    __registries: registries,
  };
};

describe('path-parametric loader cores', () => {
  describe('loadPoliciesFromDir', () => {
    it('registers global policies from an arbitrary dir', async () => {
      const strapi = createStrapi();
      await loadPoliciesFromDir(strapi as any, join(RESOURCES, 'policies'));

      expect(strapi.__registries.policies.add).toHaveBeenCalledTimes(1);
      const [namespace, policies] = strapi.__registries.policies.add.mock.calls[0];
      expect(namespace).toBe('global::');
      expect(typeof policies['is-authenticated']).toBe('function');
    });

    it('no-ops when the dir does not exist', async () => {
      const strapi = createStrapi();
      await loadPoliciesFromDir(strapi as any, join(RESOURCES, 'does-not-exist'));
      expect(strapi.__registries.policies.add).not.toHaveBeenCalled();
    });

    it('legacy wrapper delegates to the core with strapi.dirs.dist.policies', async () => {
      const strapi = createStrapi({ policies: join(RESOURCES, 'policies') });
      await loadPolicies(strapi as any);

      const [namespace, policies] = strapi.__registries.policies.add.mock.calls[0];
      expect(namespace).toBe('global::');
      expect(typeof policies['is-authenticated']).toBe('function');
    });
  });

  describe('loadLocalMiddlewaresFromDir', () => {
    it('returns the middleware factory map from an arbitrary dir', async () => {
      const strapi = createStrapi();
      const map = await loadLocalMiddlewaresFromDir(strapi as any, join(RESOURCES, 'middlewares'));
      expect(typeof map.timer).toBe('function');
    });

    it('returns an empty map when the dir does not exist', async () => {
      const strapi = createStrapi();
      const map = await loadLocalMiddlewaresFromDir(strapi as any, join(RESOURCES, 'nope'));
      expect(map).toEqual({});
    });

    it('legacy wrapper registers global:: and strapi:: namespaces', async () => {
      const strapi = createStrapi({ middlewares: join(RESOURCES, 'middlewares') });
      await loadMiddlewares(strapi as any);

      const namespaces = strapi.__registries.middlewares.add.mock.calls.map((c: any[]) => c[0]);
      expect(namespaces).toEqual(['global::', 'strapi::']);
      const globalMiddlewares = strapi.__registries.middlewares.add.mock.calls[0][1];
      expect(typeof globalMiddlewares.timer).toBe('function');
    });
  });

  describe('loadSrcIndexFromDir', () => {
    it('assigns a validated index module to strapi.app from an arbitrary dir', () => {
      const strapi = createStrapi();
      loadSrcIndexFromDir(strapi as any, join(RESOURCES, 'src'));
      expect(typeof (strapi.app as any).register).toBe('function');
      expect(typeof (strapi.app as any).bootstrap).toBe('function');
    });

    it('no-ops when the src dir does not exist', () => {
      const strapi = createStrapi();
      loadSrcIndexFromDir(strapi as any, join(RESOURCES, 'no-src'));
      expect(strapi.app).toBeUndefined();
    });

    it('legacy wrapper delegates to strapi.dirs.dist.src', () => {
      const strapi = createStrapi({ src: join(RESOURCES, 'src') });
      loadSrcIndex(strapi as any);
      expect(typeof (strapi.app as any).register).toBe('function');
    });
  });

  describe('loadAPIsFromDir', () => {
    it('assembles and registers an api from an arbitrary dir', async () => {
      const strapi = createStrapi();
      await loadAPIsFromDir(strapi as any, join(RESOURCES, 'api'));

      expect(strapi.__registries.apis.add).toHaveBeenCalledTimes(1);
      const [apiName, api] = strapi.__registries.apis.add.mock.calls[0];
      expect(apiName).toBe('restaurant');
      expect(typeof api.controllers.restaurant.find).toBe('function');
    });

    it('no-ops when the api dir does not exist', async () => {
      const strapi = createStrapi();
      await loadAPIsFromDir(strapi as any, join(RESOURCES, 'no-api'));
      expect(strapi.__registries.apis.add).not.toHaveBeenCalled();
    });

    it('legacy wrapper delegates to strapi.dirs.dist.api', async () => {
      const strapi = createStrapi({ api: join(RESOURCES, 'api') });
      await loadAPIs(strapi as any);
      expect(strapi.__registries.apis.add.mock.calls[0][0]).toBe('restaurant');
    });
  });
});
