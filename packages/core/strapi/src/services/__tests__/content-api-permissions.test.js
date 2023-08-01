'use strict';

const createContentAPI = require('../content-api');

describe('Content API - Permissions', () => {
  const bindToContentAPI = (action) => {
    Object.assign(action, { [Symbol.for('__type__')]: ['content-api'] });
    return action;
  };

  describe('Get Actions Map', () => {
    test('When no API are defined, it should return an empty object', () => {
      global.strapi = {};

      const contentAPI = createContentAPI(global.strapi);
      const actionsMap = contentAPI.permissions.getActionsMap();

      expect(actionsMap).toEqual({});
    });

    test('When no controller are defined for an API, it should ignore the API', () => {
      global.strapi = {
        api: {
          foo: {},
          bar: {},
        },
      };

      const contentAPI = createContentAPI(global.strapi);
      const actionsMap = contentAPI.permissions.getActionsMap();

      expect(actionsMap).toEqual({});
    });

    test(`Do not register controller if they're not bound to the content API`, () => {
      const actionC = () => {};
      Object.assign(actionC, { [Symbol.for('__type__')]: ['admin-api'] });

      global.strapi = {
        api: {
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
      };

      const contentAPI = createContentAPI(global.strapi);
      const actionsMap = contentAPI.permissions.getActionsMap();

      expect(actionsMap).toEqual({
        'api::foo': { controllers: { controllerA: ['actionA'] } },
      });
    });

    test('Creates and populate a map of actions from APIs and plugins', () => {
      global.strapi = {
        api: {
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
      };

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
        api: {
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
      };
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
        log: {
          debug: jest.fn(),
        },
      };

      const contentAPI = createContentAPI();

      const ability = await contentAPI.permissions.engine.generateAbility([{ action: 'foo' }]);

      expect(ability.rules).toHaveLength(0);
      expect(global.strapi.log.debug).toHaveBeenCalledWith(
        `Unknown action "foo" supplied when registering a new permission`
      );
    });

    test('Engine filter out invalid action when generating an ability', async () => {
      global.strapi = {
        log: {
          debug: jest.fn(),
        },

        api: {
          foo: {
            controllers: {
              bar: { foobar: bindToContentAPI(() => {}) },
            },
          },
        },
      };

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
});
