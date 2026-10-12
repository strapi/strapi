import fs from 'fs';
import os from 'os';
import path from 'path';

import type { Core } from '@strapi/types';

import * as factories from '../../factories';
import { detectCustomizations, isLifecycleNonEmpty } from '../detect-customizations';

interface MakeStrapiOverrides {
  controllers?: Record<string, unknown>;
  services?: Record<string, unknown>;
  apis?: Record<string, { routes: Record<string, unknown> }>;
  app?: Record<string, unknown>;
  extensionsDir?: string;
}

const makeStrapi = (overrides: MakeStrapiOverrides = {}): Core.Strapi => {
  const apis = overrides.apis ?? {};
  return {
    controllers: overrides.controllers ?? {},
    services: overrides.services ?? {},
    api: (name: string) => apis[name],
    app: overrides.app,
    dirs: { dist: { extensions: overrides.extensionsDir ?? '/nonexistent/extensions' } },
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

  it('is false for an empty body despite a commented destructured param', () => {
    expect(isLifecycleNonEmpty(function register(/* { strapi } */) {})).toBe(false);
  });

  it('is true for a concise arrow body', () => {
    // `register: ({ strapi }) => strapi.log.info('x')` has no braces at all, so looking
    // for the body after the first `{` finds nothing and used to report "empty".
    expect(isLifecycleNonEmpty((strapi: any) => strapi.log.info('real work'))).toBe(true);
  });

  it('is true for an async concise arrow body', () => {
    expect(isLifecycleNonEmpty(async (strapi: any) => strapi.doThing())).toBe(true);
  });

  it('is true for a concise arrow returning an object literal', () => {
    expect(isLifecycleNonEmpty(() => ({ registered: true }))).toBe(true);
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
    it('does not flag a default factory-minted service as custom', () => {
      const service = factories.createCoreService(contentTypeUid)({ strapi: minimalStrapi });
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: {} },
        services: { [contentTypeUid]: service },
        apis: { a: { routes: {} } },
      });
      expect(detectCustomizations(strapi).apis[0].customService).toBe(false);
    });

    it('flags a service with an extra own method as custom', () => {
      // A cfg-built custom service carries the user method as an OWN key absent
      // from its factory prototype. Start from a real factory service and add
      // one, so the fixture stays faithful to createCoreService's output shape.
      const service = factories.createCoreService(contentTypeUid)({
        strapi: minimalStrapi,
      }) as Record<string, unknown>;
      service.myCustomMethod = () => {};
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: {} },
        services: { [contentTypeUid]: service },
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

    it('flags a plain action map that never went through the factory as custom', () => {
      // `module.exports = { async find(ctx) { ... } }` is entirely hand-written, but carries no
      // factory symbol at all.
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: { find: async () => 'hand-written' } },
        apis: { a: { routes: {} } },
      });
      expect(detectCustomizations(strapi).apis[0].customController).toBe(true);
    });

    it('does not throw on a controller factory that returned nothing', () => {
      const strapi = makeStrapi({
        controllers: { [contentTypeUid]: null },
        apis: { a: { routes: {} } },
      });
      expect(() => detectCustomizations(strapi)).not.toThrow();
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

    it('does not flag the default template (commented destructured params) as beyond template', () => {
      const strapi = makeStrapi({
        app: {
          register(/* { strapi } */) {},
          bootstrap(/* { strapi } */) {},
        },
      });
      const src = detectCustomizations(strapi).srcIndex;
      expect(src.registerNonEmpty).toBe(false);
      expect(src.bootstrapNonEmpty).toBe(false);
      expect(src.beyondTemplate).toBe(false);
    });

    it('flags a non-empty body even when the param region contains a brace', () => {
      const doThing = () => {};
      const strapi = makeStrapi({
        app: {
          register(/* { strapi } */) {},
          bootstrap(/* { strapi } */) {
            doThing();
          },
        },
      });
      expect(detectCustomizations(strapi).srcIndex.beyondTemplate).toBe(true);
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

  // The dump is used to rebuild an app for debugging, so it covers every controller, not only
  // the app's own api:: ones.
  describe('all controllers', () => {
    it('lists every controller, plugin and admin ones included', () => {
      const stock = factories.createCoreController(contentTypeUid)({ strapi: minimalStrapi });
      const strapi = makeStrapi({
        controllers: {
          [contentTypeUid]: stock,
          // Plugin and admin controllers are plain objects even when stock
          'plugin::users-permissions.auth': { callback: async () => 'stock' },
          'admin::authentication': { login: async () => 'stock' },
        },
        apis: { a: { routes: {} } },
      });

      expect(detectCustomizations(strapi).controllers).toEqual([
        { uid: contentTypeUid, custom: false },
        { uid: 'plugin::users-permissions.auth', custom: false },
        { uid: 'admin::authentication', custom: false },
      ]);
    });

    it('counts custom controllers across every namespace', () => {
      const pluginCustom = factories.createCoreController(
        contentTypeUid,
        {}
      )({
        strapi: minimalStrapi,
      });
      const strapi = makeStrapi({
        controllers: {
          [contentTypeUid]: { find: async () => 'hand-written' },
          'plugin::some-plugin.thing': pluginCustom,
          'plugin::users-permissions.auth': { callback: async () => 'stock' },
        },
        apis: { a: { routes: {} } },
      });

      const result = detectCustomizations(strapi);
      expect(result.counts.customControllers).toBe(2);
      expect(result.controllers.find((c) => c.uid === 'plugin::some-plugin.thing')?.custom).toBe(
        true
      );
    });

    it('does not throw on a non-object plugin controller', () => {
      const strapi = makeStrapi({ controllers: { 'plugin::broken.thing': null } });
      expect(detectCustomizations(strapi).controllers).toEqual([
        { uid: 'plugin::broken.thing', custom: false },
      ]);
    });
  });

  // Plugin controllers are plain objects even when stock, so an override made through
  // src/extensions cannot be told from the controller itself; the extension folder is the signal.
  describe('extended plugins', () => {
    let dir: string;

    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-extensions-'));
    });

    afterEach(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it('lists plugins with a strapi-server extension or content-type overrides', () => {
      fs.mkdirSync(path.join(dir, 'users-permissions'));
      fs.writeFileSync(path.join(dir, 'users-permissions', 'strapi-server.js'), '');
      fs.mkdirSync(path.join(dir, 'upload', 'content-types', 'file'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'upload', 'content-types', 'file', 'schema.json'), '{}');
      // An empty folder overrides nothing
      fs.mkdirSync(path.join(dir, 'i18n'));

      const strapi = makeStrapi({ extensionsDir: dir });

      expect(detectCustomizations(strapi).extendedPlugins).toEqual(['upload', 'users-permissions']);
    });

    it('does not list a plugin whose content-types folder holds no schema', () => {
      // The loader only applies content-types/<name>/schema.json; an empty folder changes nothing.
      fs.mkdirSync(path.join(dir, 'i18n', 'content-types', 'locale'), { recursive: true });

      const strapi = makeStrapi({ extensionsDir: dir });

      expect(detectCustomizations(strapi).extendedPlugins).toEqual([]);
    });

    it('is empty when the app has no extensions folder', () => {
      expect(detectCustomizations(makeStrapi()).extendedPlugins).toEqual([]);
    });
  });
});
