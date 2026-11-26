import { describe, it, expect } from 'vitest';

import { createContentApiRoutesFactory } from '../content-api-router';
import { isBuiltRouter, routesOf } from '../module-routers';

type TestRoute = { method: string; path: string };

const route: TestRoute = { method: 'GET', path: '/items' };

describe('module routers', () => {
  describe('isBuiltRouter', () => {
    it('is true for a router declared as an object', () => {
      expect(isBuiltRouter({ type: 'admin', routes: [route] })).toBe(true);
    });

    it('is true for the router built from a factory', () => {
      const factory = () => ({ type: 'content-api', routes: [route] });

      expect(isBuiltRouter(factory())).toBe(true);
    });

    it('is false for a declared factory, with or without routes', () => {
      expect(isBuiltRouter(() => ({ routes: [route] }))).toBe(false);
      expect(isBuiltRouter(createContentApiRoutesFactory(() => [route]))).toBe(false);
    });
  });

  describe('routesOf', () => {
    it('returns the routes of a router object, the same array', () => {
      const routes = [route];

      expect(routesOf({ type: 'admin', prefix: '/admin', routes })).toBe(routes);
    });

    it('returns the routes of the router built from a factory', () => {
      const factory = createContentApiRoutesFactory(() => [route]);
      const built = factory();

      expect(routesOf(built)).toBe(built.routes);
      expect(routesOf(built)).toEqual([route]);
    });

    it('returns the routes a content-api factory exposes', () => {
      const factory = createContentApiRoutesFactory(() => [route]);

      expect(routesOf(factory)).toBe(factory.routes);
      expect(routesOf(factory)).toEqual([route]);
    });

    it('returns the routes a factory exposes, without calling it', () => {
      const routes = [route];
      let called = false;
      const factory = Object.assign(
        () => {
          called = true;
          return { type: 'content-api' as const, routes };
        },
        { routes }
      );

      expect(routesOf(factory)).toBe(routes);
      expect(called).toBe(false);
    });

    it('returns no routes for a factory that does not expose them, without calling it', () => {
      let called = false;
      const factory = () => {
        called = true;
        return { type: 'content-api' as const, routes: [route] };
      };

      expect(routesOf<TestRoute>(factory)).toEqual([]);
      expect(called).toBe(false);
    });

    it('returns an array of routes as is, the same array', () => {
      const routes = [route];

      expect(routesOf(routes)).toBe(routes);
    });

    it('reads every router of a module, declared or built', () => {
      const declared = {
        admin: { type: 'admin', routes: [route] },
        'content-api': createContentApiRoutesFactory(() => [{ method: 'POST', path: '/items' }]),
        custom: () => ({ type: 'content-api', routes: [route] }),
        array: [{ method: 'PUT', path: '/items' }],
      };

      expect(Object.values(declared).flatMap(routesOf)).toEqual([
        route,
        { method: 'POST', path: '/items' },
        { method: 'PUT', path: '/items' },
      ]);
    });
  });
});
