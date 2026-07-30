import * as z from 'zod/v4';

import createContentAPI from '../content-api';

const strapiMock = {
  sanitizers: {
    get() {
      return [];
    },
  },
  validators: {
    get() {
      return [];
    },
  },
};

describe('Content API - Permissions', () => {
  const bindToContentAPI = (action: any) => {
    Object.assign(action, { [Symbol.for('__type__')]: ['content-api'] });
    return action;
  };

  describe('Get Actions Map', () => {
    test('When no API are defined, it should return an empty object', () => {
      global.strapi = strapiMock as any;

      const contentAPI = createContentAPI(global.strapi);
      const actionsMap = contentAPI.permissions.getActionsMap();

      expect(actionsMap).toEqual({});
    });

    test('When no controller are defined for an API, it should ignore the API', () => {
      global.strapi = {
        ...strapiMock,
        apis: {
          foo: {},
          bar: {},
        },
      } as any;

      const contentAPI = createContentAPI(global.strapi);
      const actionsMap = contentAPI.permissions.getActionsMap();

      expect(actionsMap).toEqual({});
    });

    test(`Do not register controller if they're not bound to the content API`, () => {
      const actionC = () => {};
      Object.assign(actionC, { [Symbol.for('__type__')]: ['admin-api'] });

      global.strapi = {
        ...strapiMock,
        apis: {
          foo: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
                actionB() {},
                actionC,
              },
            },
          },
        },
      } as any;

      const contentAPI = createContentAPI(global.strapi);
      const actionsMap = contentAPI.permissions.getActionsMap();

      expect(actionsMap).toEqual({
        'api::foo': { controllers: { controllerA: ['actionA'] } },
      });
    });

    test('Creates and populate a map of actions from APIs and plugins', () => {
      global.strapi = {
        ...strapiMock,
        apis: {
          foo: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
                actionB: bindToContentAPI(() => {}),
              },
            },
          },
          bar: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
                actionB: bindToContentAPI(() => {}),
              },
            },
          },
          foobar: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
                actionB: bindToContentAPI(() => {}),
              },
              controllerB: {
                actionC: bindToContentAPI(() => {}),
                actionD: bindToContentAPI(() => {}),
              },
            },
          },
        },
        plugins: {
          foo: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
                actionB: bindToContentAPI(() => {}),
              },
            },
          },
          bar: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
                actionB: bindToContentAPI(() => {}),
              },
            },
          },
        },
      } as any;

      const contentAPI = createContentAPI(global.strapi);
      const actionsMap = contentAPI.permissions.getActionsMap();

      expect(actionsMap).toEqual({
        'api::foo': { controllers: { controllerA: ['actionA', 'actionB'] } },
        'api::bar': { controllers: { controllerA: ['actionA', 'actionB'] } },
        'api::foobar': {
          controllers: {
            controllerA: ['actionA', 'actionB'],
            controllerB: ['actionC', 'actionD'],
          },
        },
        'plugin::foo': { controllers: { controllerA: ['actionA', 'actionB'] } },
        'plugin::bar': { controllers: { controllerA: ['actionA', 'actionB'] } },
      });
    });
  });

  describe('Register Actions', () => {
    beforeEach(() => {
      global.strapi = {
        ...strapiMock,
        apis: {
          foo: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
                actionB: bindToContentAPI(() => {}),
              },
              controllerB: {
                actionC: bindToContentAPI(() => {}),
                actionD: bindToContentAPI(() => {}),
              },
            },
          },
        },
        plugins: {
          foo: {
            controllers: {
              controllerA: {
                actionA: bindToContentAPI(() => {}),
              },
            },
          },
        },
      } as any;
    });

    test('The action provider should holds every action from APIs and plugins', async () => {
      const contentAPI = createContentAPI(global.strapi);

      await contentAPI.permissions.registerActions();

      const values = contentAPI.permissions.providers.action.values();

      expect(values).toEqual([
        {
          uid: 'api::foo.controllerA.actionA',
          api: 'api::foo',
          controller: 'controllerA',
          action: 'actionA',
        },
        {
          uid: 'api::foo.controllerA.actionB',
          api: 'api::foo',
          controller: 'controllerA',
          action: 'actionB',
        },
        {
          uid: 'api::foo.controllerB.actionC',
          api: 'api::foo',
          controller: 'controllerB',
          action: 'actionC',
        },
        {
          uid: 'api::foo.controllerB.actionD',
          api: 'api::foo',
          controller: 'controllerB',
          action: 'actionD',
        },
        {
          uid: 'plugin::foo.controllerA.actionA',
          api: 'plugin::foo',
          controller: 'controllerA',
          action: 'actionA',
        },
      ]);
    });

    test('Call registerActions twice should throw a duplicate error', async () => {
      const contentAPI = createContentAPI(global.strapi);

      await contentAPI.permissions.registerActions();

      expect(() => contentAPI.permissions.registerActions()).rejects.toThrowError(
        'Duplicated item key: api::foo.controllerA.actionA'
      );
    });
  });

  describe('Providers', () => {
    test('You should not be able to register action once strapi is loaded', () => {
      global.strapi.isLoaded = true;

      const contentAPI = createContentAPI(global.strapi);

      // Actions
      expect(() =>
        contentAPI.permissions.providers.action.register('foo', {})
      ).rejects.toThrowError(`You can't register new actions outside the bootstrap function.`);

      // Conditions
      expect(() =>
        contentAPI.permissions.providers.condition.register({ name: 'myCondition' })
      ).rejects.toThrowError(`You can't register new conditions outside the bootstrap function.`);

      // Register Actions
      expect(() => contentAPI.permissions.registerActions()).rejects.toThrowError(
        `You can't register new actions outside the bootstrap function.`
      );
    });
  });

  describe('Engine', () => {
    test('Engine warns when registering an unknown action', async () => {
      global.strapi = {
        ...strapiMock,
        log: {
          debug: jest.fn(),
        },
      } as any;

      const contentAPI = createContentAPI(global.strapi);

      const ability = await contentAPI.permissions.engine.generateAbility([{ action: 'foo' }]);

      expect(ability.rules).toHaveLength(0);
      expect(global.strapi.log.debug).toHaveBeenCalledWith(
        `Unknown action "foo" supplied when registering a new permission`
      );
    });

    test('Engine filter out invalid action when generating an ability', async () => {
      global.strapi = {
        ...strapiMock,
        log: {
          debug: jest.fn(),
        },

        apis: {
          foo: {
            controllers: {
              bar: { foobar: bindToContentAPI(() => {}) },
            },
          },
        },
      } as any;

      const contentAPI = createContentAPI(global.strapi);

      await contentAPI.permissions.registerActions();

      const ability = await contentAPI.permissions.engine.generateAbility([
        { action: 'foo' },
        { action: 'api::foo.bar.foobar' },
      ]);

      expect(ability.rules).toHaveLength(1);
      expect(ability.rules).toEqual([
        {
          action: 'api::foo.bar.foobar',
          subject: 'all',
        },
      ]);

      expect(global.strapi.log.debug).toHaveBeenCalledTimes(1);
      expect(global.strapi.log.debug).toHaveBeenCalledWith(
        `Unknown action "foo" supplied when registering a new permission`
      );
    });
  });

  describe('addQueryParams / addInputParams / applyExtraParamsToRoutes', () => {
    const minimalStrapi = { ...strapiMock, apis: {}, plugins: {} } as any;

    /** Minimal content-api route; pass request (and optionally method/path) to override. */
    const contentAPIRoute = (overrides: Record<string, unknown> = {}) => ({
      method: 'GET',
      path: '/api/foo',
      handler: '',
      info: { type: 'content-api' as const },
      request: {},
      ...overrides,
    });

    let contentAPI: ReturnType<typeof createContentAPI>;

    beforeEach(() => {
      global.strapi = minimalStrapi;
      contentAPI = createContentAPI(global.strapi);
    });

    it('applyExtraParamsToRoutes throws when a route already has the query param', () => {
      contentAPI.addQueryParams({ search: { schema: z.string() } });
      const route = contentAPIRoute({
        request: { query: { search: z.string() } },
      });
      expect(() => contentAPI.applyExtraParamsToRoutes([route])).toThrow(
        /param "search" already exists on route/
      );
    });

    it('applyExtraParamsToRoutes throws when a route already has the input param', () => {
      contentAPI.addInputParams({ clientMutationId: { schema: z.string() } });
      const route = contentAPIRoute({
        method: 'POST',
        request: { body: { 'application/json': z.object({ clientMutationId: z.string() }) } },
      });
      expect(() => contentAPI.applyExtraParamsToRoutes([route])).toThrow(
        /param "clientMutationId" already exists on route/
      );
    });

    it('addQueryParams throws when the same param name is added twice', () => {
      contentAPI.addQueryParams({ search: { schema: z.string() } });
      expect(() => contentAPI.addQueryParams({ search: { schema: z.number() } })).toThrow(
        /contentAPI\.addQueryParams: param "search" has already been added/
      );
    });

    it('addInputParams throws when the same param name is added twice', () => {
      contentAPI.addInputParams({ clientMutationId: { schema: z.string() } });
      expect(() => contentAPI.addInputParams({ clientMutationId: { schema: z.number() } })).toThrow(
        /contentAPI\.addInputParams: param "clientMutationId" has already been added/
      );
    });

    it.each(['filters', 'sort'])('addQueryParams throws when param "%s" is reserved', (param) => {
      expect(() => contentAPI.addQueryParams({ [param]: { schema: z.string() } })).toThrow(
        new RegExp(`param "${param}" is reserved by Strapi; use a different name`)
      );
    });

    it.each(['id', 'documentId'])('addInputParams throws when param "%s" is reserved', (param) => {
      expect(() => contentAPI.addInputParams({ [param]: { schema: z.string() } })).toThrow(
        new RegExp(`param "${param}" is reserved by Strapi; use a different name`)
      );
    });

    it('addQueryParams throws when schema is a nested object (only scalars/arrays of scalars allowed)', () => {
      expect(() =>
        contentAPI.addQueryParams({
          filter: { schema: z.object({ name: z.string() }) },
        })
      ).toThrow(/contentAPI\.addQueryParams: param "filter" schema must be a scalar/);
    });

    it('addQueryParams accepts array of scalars and merges into route', () => {
      contentAPI.addQueryParams({ tags: { schema: z.array(z.string()) } });
      const route = contentAPIRoute({ request: { query: {} } });
      expect(() => contentAPI.applyExtraParamsToRoutes([route])).not.toThrow();
      expect(route.request?.query).toHaveProperty('tags');
      const tagsSchema = route.request?.query?.tags as z.ZodType;
      expect(tagsSchema).toBeDefined();
      expect(tagsSchema.safeParse(['a', 'b']).success).toBe(true);
    });

    it('addQueryParams accepts schema as function that receives z and returns schema', () => {
      contentAPI.addQueryParams({
        search: { schema: (zInstance) => zInstance.string().max(200).optional() },
      });
      const route = contentAPIRoute({ path: '/api/articles', request: { query: {} } });
      expect(() => contentAPI.applyExtraParamsToRoutes([route])).not.toThrow();
      expect(route.request?.query).toHaveProperty('search');
      const searchSchema = route.request?.query?.search as z.ZodType;
      expect(searchSchema.safeParse('foo').success).toBe(true);
    });

    it('addInputParams accepts schema as function that receives z and returns schema', () => {
      contentAPI.addInputParams({
        clientMutationId: { schema: (zInstance) => zInstance.string().max(100).optional() },
      });
      const route = contentAPIRoute({
        method: 'POST',
        path: '/api/articles',
        request: { body: {} },
      });
      expect(() => contentAPI.applyExtraParamsToRoutes([route])).not.toThrow();
      const bodySchema = route.request?.body?.['application/json'] as {
        shape: Record<string, z.ZodType>;
      };
      expect(bodySchema?.shape?.clientMutationId).toBeDefined();
    });
  });
});
