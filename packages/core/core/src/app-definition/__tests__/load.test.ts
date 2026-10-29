import { join } from 'path';

import { runProgrammaticLoaders } from '../load';
import { defineApp } from '../define-app';
import { fromDisk } from '../sources';
import * as is from '../attributes';
import { CUSTOM_API_NAME } from '../normalize';

const RESOURCES = join(__dirname, 'resources');

const createStrapi = () => {
  const calls = {
    apis: [] as Array<[string, any]>,
    policies: [] as Array<[string, any]>,
    middlewares: [] as Array<[string, any]>,
    sanitizers: [] as Array<[string, any]>,
    validators: [] as Array<[string, any]>,
    plugins: [] as Array<[string, any]>,
    components: [] as any[],
    config: {} as Record<string, unknown>,
  };

  const registry = (key: keyof typeof calls) => ({
    add: (...args: any[]) => (calls[key] as any[]).push(args.length > 1 ? args : args[0]),
    set: (...args: any[]) => (calls[key] as any[]).push(args),
  });

  const strapi = {
    app: undefined as unknown,
    config: {
      set(k: string, v: unknown) {
        calls.config[k] = v;
      },
    },
    stopWithError: jest.fn(),
    get: jest.fn((name: string) => {
      switch (name) {
        case 'apis':
          return registry('apis');
        case 'policies':
          return registry('policies');
        case 'middlewares':
          return registry('middlewares');
        case 'sanitizers':
          return registry('sanitizers');
        case 'validators':
          return registry('validators');
        case 'plugins':
          return registry('plugins');
        case 'components':
          return { add: (c: any) => calls.components.push(c) };
        default:
          return undefined;
      }
    }),
  };

  return { strapi: strapi as any, calls };
};

describe('runProgrammaticLoaders', () => {
  it('always registers default content-api sanitizers and validators', async () => {
    const { strapi, calls } = createStrapi();
    await runProgrammaticLoaders(strapi, defineApp({}));

    expect(calls.sanitizers).toContainEqual(['content-api', { input: [], output: [], query: [] }]);
    expect(calls.validators).toContainEqual(['content-api', { input: [], query: [] }]);
  });

  it('registers in-code content types as APIs with auto-CRUD', async () => {
    const { strapi, calls } = createStrapi();
    await runProgrammaticLoaders(
      strapi,
      defineApp({
        contentTypes: [
          {
            singularName: 'article',
            pluralName: 'articles',
            displayName: 'Article',
            attributes: { title: is.string() },
          },
        ],
      })
    );

    const articleApi = calls.apis.find(([name]) => name === 'article');
    expect(articleApi).toBeDefined();
    expect(typeof articleApi![1].controllers.article).toBe('function');
  });

  it('attaches in-code custom routes to the synthetic application API', async () => {
    const { strapi, calls } = createStrapi();
    await runProgrammaticLoaders(
      strapi,
      defineApp({ routes: ({ post }) => [post('/echo', () => ({}))] })
    );

    const appApi = calls.apis.find(([name]) => name === CUSTOM_API_NAME);
    expect(appApi).toBeDefined();
    expect(appApi![1].routes.custom.routes).toHaveLength(1);
  });

  it('registers in-code components in the components registry', async () => {
    const { strapi, calls } = createStrapi();
    await runProgrammaticLoaders(
      strapi,
      defineApp({
        components: [
          { uid: 'default.dish', displayName: 'Dish', attributes: { name: is.string() } },
        ],
      })
    );

    expect(calls.components).toHaveLength(1);
    expect(calls.components[0]['default.dish']).toMatchObject({
      uid: 'default.dish',
      category: 'default',
      modelType: 'component',
    });
  });

  it('registers in-code policies under global::', async () => {
    const { strapi, calls } = createStrapi();
    const policy = () => true;
    await runProgrammaticLoaders(strapi, defineApp({ policies: { 'is-owner': policy } }));

    expect(calls.policies).toContainEqual(['global::', { 'is-owner': policy }]);
  });

  it('always registers strapi:: internal middlewares plus in-code global ones', async () => {
    const { strapi, calls } = createStrapi();
    const mw = () => (ctx: unknown, next: () => unknown) => next();
    await runProgrammaticLoaders(strapi, defineApp({ middlewares: { timer: mw } }));

    const namespaces = calls.middlewares.map(([ns]) => ns);
    expect(namespaces).toEqual(['global::', 'strapi::']);
    expect(calls.middlewares[0][1]).toEqual({ timer: mw });
  });

  it('composes in-code lifecycles into strapi.app', async () => {
    const { strapi } = createStrapi();
    const bootstrap = () => {};
    await runProgrammaticLoaders(strapi, defineApp({ bootstrap }));
    expect(strapi.app).toEqual({ bootstrap });
  });

  it('sets an empty enabledPlugins map when no plugins are declared', async () => {
    const { strapi, calls } = createStrapi();
    await runProgrammaticLoaders(strapi, defineApp({}));
    expect(calls.config.enabledPlugins).toEqual({});
  });

  it('import-and-adds programmatic plugins (no package.json scan)', async () => {
    const { strapi, calls } = createStrapi();
    await runProgrammaticLoaders(
      strapi,
      defineApp({ plugins: { 'my-plugin': { register() {} } as any } })
    );
    expect(calls.plugins.map(([name]) => name)).toEqual(['my-plugin']);
  });

  describe('fromDisk sources', () => {
    it('loads content types from an api directory', async () => {
      const { strapi, calls } = createStrapi();
      await runProgrammaticLoaders(
        strapi,
        defineApp({ contentTypes: fromDisk(join(RESOURCES, 'api')) })
      );
      expect(calls.apis.map(([name]) => name)).toContain('restaurant');
    });

    it('loads policies from a directory', async () => {
      const { strapi, calls } = createStrapi();
      await runProgrammaticLoaders(
        strapi,
        defineApp({ policies: fromDisk(join(RESOURCES, 'disk-policies')) })
      );
      const [, policies] = calls.policies.find(([ns]) => ns === 'global::')!;
      expect(typeof policies.restrict).toBe('function');
    });
  });

  describe('top-level `from` fallback', () => {
    it('fills unspecified resources from the project root', async () => {
      const { strapi, calls } = createStrapi();
      await runProgrammaticLoaders(
        strapi,
        defineApp({ from: fromDisk(join(RESOURCES, 'project')) })
      );

      expect(calls.apis.map(([name]) => name)).toContain('widget');
      const policyCall = calls.policies.find(([ns]) => ns === 'global::');
      expect(typeof policyCall![1]['is-admin']).toBe('function');
    });

    it('lets an in-code resource take precedence over the fallback', async () => {
      const { strapi, calls } = createStrapi();
      const policy = () => true;
      await runProgrammaticLoaders(
        strapi,
        defineApp({
          from: fromDisk(join(RESOURCES, 'project')),
          policies: { 'in-code': policy },
        })
      );

      const [, policies] = calls.policies.find(([ns]) => ns === 'global::')!;
      expect(policies).toEqual({ 'in-code': policy });
      expect(policies['is-admin']).toBeUndefined();
    });
  });
});
