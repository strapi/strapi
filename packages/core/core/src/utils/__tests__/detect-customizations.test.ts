import type { Core } from '@strapi/types';

import * as factories from '../../factories';
import { detectCustomizations, isLifecycleNonEmpty } from '../detect-customizations';

interface MakeStrapiOverrides {
  controllers?: Record<string, unknown>;
  services?: Record<string, unknown>;
  apis?: Record<string, { routes: Record<string, unknown> }>;
  app?: Record<string, unknown>;
}

const makeStrapi = (overrides: MakeStrapiOverrides = {}): Core.Strapi => {
  const apis = overrides.apis ?? {};
  return {
    controllers: overrides.controllers ?? {},
    services: overrides.services ?? {},
    api: (name: string) => apis[name],
    app: overrides.app,
  } as unknown as Core.Strapi;
};

describe('isLifecycleNonEmpty', () => {
  it('is false for an empty-bodied function', () => {
    expect(isLifecycleNonEmpty(() => {})).toBe(false);
    expect(isLifecycleNonEmpty(function emptyNamed() {})).toBe(false);
  });

  it('is false for a non-function', () => {
    expect(isLifecycleNonEmpty(undefined)).toBe(false);
    expect(isLifecycleNonEmpty('not a function')).toBe(false);
  });

  it('is true for a function with a real body', () => {
    expect(
      isLifecycleNonEmpty(() => {
        console.log('x');
      })
    ).toBe(true);
  });
});

describe('detectCustomizations', () => {
  const contentTypeUid = 'api::a.a' as const;

  // A minimal strapi stub sufficient for `factories.createCoreController` /
  // `factories.createCoreService` to mint real, factory-shaped instances.
  const minimalStrapi = {
    contentType: () => ({ uid: contentTypeUid, kind: 'collectionType', attributes: {} }),
  } as unknown as Core.Strapi;

  describe('service heuristic (Critical fix)', () => {
    // Faithful to the real `createCoreService` output: CRUD methods live on
    // the service's DIRECT prototype (the base service instance), and the
    // only own key — on both the base service and a default user service —
    // is `contentType`. A plain object literal with methods as own keys
    // would not exercise the bug this heuristic fixes.
    const makeService = (extra: Record<string, unknown> = {}) => {
      const classProto = { find() {}, findOne() {}, create() {}, update() {}, delete() {} };
      const baseService = Object.setPrototypeOf(
        { contentType: { uid: contentTypeUid } },
        classProto
      );
      return Object.setPrototypeOf({ contentType: { uid: contentTypeUid }, ...extra }, baseService);
    };

    it('does not flag a default factory-shaped service as custom', () => {
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: {} },
        services: { [contentTypeUid]: makeService() },
        apis: { a: { routes: {} } },
      });
      expect(detectCustomizations(strapi).apis[0].customService).toBe(false);
    });

    it('flags a service with an extra own method as custom', () => {
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: {} },
        services: { [contentTypeUid]: makeService({ myCustomMethod() {} }) },
        apis: { a: { routes: {} } },
      });
      expect(detectCustomizations(strapi).apis[0].customService).toBe(true);
    });
  });

  describe('controller detection (factory-minted)', () => {
    it('does not flag a default createCoreController result as custom', () => {
      const controller = factories.createCoreController(contentTypeUid)({
        strapi: minimalStrapi,
      });
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: controller },
        apis: { a: { routes: {} } },
      });
      expect(detectCustomizations(strapi).apis[0].customController).toBe(false);
    });

    it('flags a createCoreController result minted with a cfg object as custom', () => {
      const controller = factories.createCoreController(
        contentTypeUid,
        {}
      )({
        strapi: minimalStrapi,
      });
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: controller },
        apis: { a: { routes: {} } },
      });
      expect(detectCustomizations(strapi).apis[0].customController).toBe(true);
    });
  });

  describe('route detection', () => {
    const factoryRouter = {
      type: 'content-api',
      get routes() {
        return [];
      },
    };

    it('does not flag an api with only the factory router as custom', () => {
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: {} },
        apis: { a: { routes: { 'content-api': factoryRouter } } },
      });
      expect(detectCustomizations(strapi).apis[0].customRoutes).toBe(false);
    });

    it('flags a hand-written route file (plain data property) as custom', () => {
      // Custom routes ship as a separate file in the api's `routes/`
      // directory exporting a plain `{ routes: [...] }` object, alongside
      // the factory-generated router — never by editing the generated file.
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: {} },
        apis: {
          a: {
            routes: {
              'content-api': factoryRouter,
              custom: { routes: [] },
            },
          },
        },
      });
      expect(detectCustomizations(strapi).apis[0].customRoutes).toBe(true);
    });
  });

  describe('src/index detection', () => {
    it('reports the default template as not beyond template', () => {
      const strapi = makeStrapi({ app: { register() {}, bootstrap() {} } });
      const src = detectCustomizations(strapi).srcIndex;
      expect(src.beyondTemplate).toBe(false);
      expect(src.destroyDefined).toBe(false);
    });

    it('flags a non-empty bootstrap body as beyond template', () => {
      const doThing = () => {};
      const strapi = makeStrapi({
        app: {
          register() {},
          bootstrap() {
            doThing();
          },
        },
      });
      expect(detectCustomizations(strapi).srcIndex.beyondTemplate).toBe(true);
    });

    it('flags a destroy function as beyond template', () => {
      const strapi = makeStrapi({ app: { register() {}, bootstrap() {}, destroy() {} } });
      const src = detectCustomizations(strapi).srcIndex;
      expect(src.destroyDefined).toBe(true);
      expect(src.beyondTemplate).toBe(true);
    });
  });

  describe('api:: scoping', () => {
    it('ignores plugin:: controllers and only reports api:: apis', () => {
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: {}, 'plugin::x.y': {} },
        apis: { a: { routes: {} } },
      });
      expect(detectCustomizations(strapi).apis.map((a) => a.uid)).toEqual([contentTypeUid]);
    });
  });
});
