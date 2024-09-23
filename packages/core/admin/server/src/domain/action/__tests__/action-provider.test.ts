import { omit } from 'lodash/fp';
import createActionProvider from '../provider';
import domain from '..';

const providerMethods = [
  'register',
  'registerMany',
  'appliesToProperty',
  'delete',
  'get',
  'values',
  'keys',
  'has',
  'size',
  'clear',
  'unstable_aliases',
];

describe('Action Provider', () => {
  beforeEach(() => {
    global.strapi = {
      isLoaded: false,
      plugins: {
        bar: {},
      },
    } as any;
  });

  test('ActionProvider is a provider instance', () => {
    const actionProvider = createActionProvider();

    expect(actionProvider).toHaveProperty('hooks', expect.any(Object));

    providerMethods.forEach((methodName) =>
      expect(actionProvider).toHaveProperty(methodName, expect.any(Function))
    );
  });

  describe('Methods', () => {
    describe('Register', () => {
      test('Can register a new action using action attributes', async () => {
        const attributes = {
          section: 'settings',
          displayName: 'Foo bar',
          uid: 'foo',
          pluginName: 'bar',
          category: 'category',
          subCategory: 'subcategory',
        };
        const expected = omit('uid', attributes);
        const actionId = domain.computeActionId(attributes);

        const actionProvider = createActionProvider();

        await actionProvider.register(attributes);

        const action = actionProvider.get(actionId);

        expect(action).not.toHaveProperty('uid');
        expect(action).toHaveProperty('actionId', actionId);
        expect(action).toMatchObject(expected);
      });

      test(`Can't register an action if strapi is loaded`, async () => {
        global.strapi.isLoaded = true;

        const attributes = {
          section: 'settings',
          displayName: 'Foo bar',
          uid: 'foo',
          pluginName: 'bar',
          category: 'category',
          subCategory: 'subcategory',
          invalidField: 'invalid',
        };

        const actionProvider = createActionProvider();

        const register = () => actionProvider.register(attributes);

        await expect(register()).rejects.toThrowError(
          `You can't register new actions outside of the bootstrap function.`
        );
      });

      test(`Can't register an action with unknown attribute`, async () => {
        const attributes = {
          section: 'settings',
          displayName: 'Foo bar',
          uid: 'foo',
          pluginName: 'bar',
          category: 'category',
          subCategory: 'subcategory',
          invalidField: 'invalid',
        };

        const actionProvider = createActionProvider();

        const register = () => actionProvider.register(attributes);

        await expect(register()).rejects.toThrowError();
      });

      test('Registration hooks are triggered on register', async () => {
        const attributes = {
          section: 'settings',
          displayName: 'Foo bar',
          uid: 'foo',
          pluginName: 'bar',
          category: 'category',
          subCategory: 'subcategory',
        };

        const willRegister = jest.fn();
        const didRegister = jest.fn();

        const actionProvider = createActionProvider();

        actionProvider.hooks.willRegister.register(willRegister);
        actionProvider.hooks.didRegister.register(didRegister);

        await actionProvider.register(attributes);

        expect(willRegister).toHaveBeenCalled();
        expect(didRegister).toHaveBeenCalled();
      });
    });

    describe('Register Many', () => {
      test('Can register multiple action at once', async () => {
        const attributes = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'contentTypes',
            subjects: ['foo', 'bar'],
            displayName: 'Bar foo',
            uid: 'bar',
          },
        ] as any;

        const actionProvider = createActionProvider();

        await actionProvider.registerMany(attributes);

        expect(actionProvider.size()).toBe(attributes.length);
      });

      test(`If one action has invalid attributes, don't register the other`, async () => {
        const attributes = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'contentTypes',
            displayName: 'Bar foo',
            uid: 'bar',
          },
        ] as any;

        const actionProvider = createActionProvider();
        const registerAll = () => actionProvider.registerMany(attributes);

        await expect(registerAll()).rejects.toThrowError();
        expect(actionProvider.size()).toBe(0);
      });

      test('Registering many action shall trigger the registration hooks multiple time', async () => {
        const attributes = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'contentTypes',
            subjects: ['foo', 'bar'],
            displayName: 'Bar foo',
            uid: 'bar',
          },
        ] as any;

        const willRegister = jest.fn();
        const didRegister = jest.fn();

        const actionProvider = createActionProvider();

        actionProvider.hooks.willRegister.register(willRegister);
        actionProvider.hooks.didRegister.register(didRegister);

        await actionProvider.registerMany(attributes);

        expect(willRegister).toHaveBeenCalledTimes(2);
        expect(didRegister).toHaveBeenCalledTimes(2);
      });
    });

    describe('Applies To Property', () => {
      test('Returns false if the property cannot be applied to the action', async () => {
        const action = {
          section: 'contentTypes',
          subjects: ['foo', 'bar'],
          displayName: 'Foo bar',
          uid: 'foobar',
        } as any;

        const actionId = domain.computeActionId(action);
        const actionProvider = createActionProvider();

        await actionProvider.register(action);

        const applies = await actionProvider.appliesToProperty('fields', actionId, undefined);

        expect(applies).toBe(false);
      });

      test('Returns true if the property can be applied to the action and there is no subject', async () => {
        const action = {
          section: 'contentTypes',
          subjects: ['foo', 'bar'],
          displayName: 'Foo bar',
          uid: 'foobar',
          options: {
            applyToProperties: ['fields'],
          },
        } as any;

        const actionId = domain.computeActionId(action);
        const actionProvider = createActionProvider();

        await actionProvider.register(action);

        const applies = await actionProvider.appliesToProperty('fields', actionId, undefined);

        expect(applies).toBe(true);
      });

      test('Returns false if the property can be applied to the action but not the subject', async () => {
        const action = {
          section: 'contentTypes',
          subjects: ['foo', 'bar'],
          displayName: 'Foo bar',
          uid: 'foobar',
          options: {
            applyToProperties: ['fields'],
          },
        } as any;

        const actionId = domain.computeActionId(action);
        const actionProvider = createActionProvider();

        await actionProvider.register(action);

        const applies = await actionProvider.appliesToProperty('fields', actionId, 'foobar');

        expect(applies).toBe(false);
      });

      test('Returns true if the property and the subject can be applied to the action and there is no hook registered', async () => {
        const action = {
          section: 'contentTypes',
          subjects: ['foo', 'bar'],
          displayName: 'Foo bar',
          uid: 'foobar',
          options: {
            applyToProperties: ['fields'],
          },
        } as any;

        const actionId = domain.computeActionId(action);
        const actionProvider = createActionProvider();

        await actionProvider.register(action);

        const applies = await actionProvider.appliesToProperty('fields', actionId, 'foo');

        expect(applies).toBe(true);
      });

      test('Returns false if one of the registered hooks returns false', async () => {
        const action = {
          section: 'contentTypes',
          subjects: ['foo', 'bar'],
          displayName: 'Foo bar',
          uid: 'foobar',
          options: {
            applyToProperties: ['fields'],
          },
        } as any;

        const actionId = domain.computeActionId(action);
        const actionProvider = createActionProvider();

        const hooks = [
          jest.fn(() => true),
          jest.fn(() => undefined),
          jest.fn(() => 2),
          jest.fn(() => ({})),
          jest.fn(() => false),
        ];

        hooks.forEach((hook) => actionProvider.hooks.appliesPropertyToSubject.register(hook));

        await actionProvider.register(action);

        const actionFromProvider = actionProvider.get(actionId);
        const applies = await actionProvider.appliesToProperty('fields', actionId, 'foo');

        expect(applies).toBe(false);

        hooks.forEach((hook) =>
          expect(hook).toHaveBeenCalledWith({
            property: 'fields',
            action: actionFromProvider,
            subject: 'foo',
          })
        );
      });

      test('Returns true if none of the registered hooks returns false', async () => {
        const action = {
          section: 'contentTypes',
          subjects: ['foo', 'bar'],
          displayName: 'Foo bar',
          uid: 'foobar',
          options: {
            applyToProperties: ['fields'],
          },
        } as any;

        const actionId = domain.computeActionId(action);
        const actionProvider = createActionProvider();

        const hooks = [
          jest.fn(() => true),
          jest.fn(() => undefined),
          jest.fn(() => 2),
          jest.fn(() => ({})),
          jest.fn(() => new Date()),
        ];

        hooks.forEach((hook) => actionProvider.hooks.appliesPropertyToSubject.register(hook));

        await actionProvider.register(action);

        const actionFromProvider = actionProvider.get(actionId);
        const applies = await actionProvider.appliesToProperty('fields', actionId, 'foo');

        expect(applies).toBe(true);

        hooks.forEach((hook) =>
          expect(hook).toHaveBeenCalledWith({
            property: 'fields',
            action: actionFromProvider,
            subject: 'foo',
          })
        );
      });
    });
    describe('Aliases', () => {
      test('Return an empty array when there is no alias pointing to the given action', async () => {
        const provider = createActionProvider();
        const actions = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'settings',
            displayName: 'Bar foo',
            category: 'category',
            uid: 'bar',
          },
        ];

        await provider.registerMany(actions);

        const aliases = provider.unstable_aliases('plugin::bar.foo');

        expect(aliases).toStrictEqual([]);
      });

      test(`Return an empty array when there is an alias but the subject don't match`, async () => {
        const provider = createActionProvider();
        const actions = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'settings',
            displayName: 'Bar foo',
            category: 'category',
            uid: 'bar',
            aliases: [{ actionId: 'plugin::bar.foo', subjects: ['baz'] }],
          },
        ];

        await provider.registerMany(actions);

        const aliases = provider.unstable_aliases('plugin::bar.foo', 'bar');

        expect(aliases).toStrictEqual([]);
        expect(aliases).toHaveLength(0);
      });

      test(`Return an empty array when there is an alias but no subject is passed (when required)`, async () => {
        const provider = createActionProvider();
        const actions = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'settings',
            displayName: 'Bar foo',
            category: 'category',
            uid: 'bar',
            aliases: [{ actionId: 'plugin::bar.foo', subjects: ['baz'] }],
          },
        ];

        await provider.registerMany(actions);

        const aliases = provider.unstable_aliases('plugin::bar.foo');

        expect(aliases).toStrictEqual([]);
        expect(aliases).toHaveLength(0);
      });

      test('Return 1 result when there is a valid alias pointing to the given action', async () => {
        const provider = createActionProvider();
        const actions = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'settings',
            displayName: 'Bar foo',
            category: 'category',
            uid: 'bar',
            aliases: [{ actionId: 'plugin::bar.foo' }],
          },
        ];

        await provider.registerMany(actions);

        const aliases = provider.unstable_aliases('plugin::bar.foo');

        expect(aliases).toHaveLength(1);
        expect(aliases).toStrictEqual(['api::bar']);
      });

      test('Return 1 result when there is a valid alias pointing to the given action with a valid subject', async () => {
        const provider = createActionProvider();
        const actions = [
          {
            section: 'settings',
            displayName: 'Foo bar',
            uid: 'foo',
            pluginName: 'bar',
            category: 'category',
            subCategory: 'subcategory',
          },
          {
            section: 'settings',
            displayName: 'Bar foo',
            category: 'category',
            uid: 'bar',
            aliases: [{ actionId: 'plugin::bar.foo', subjects: ['baz'] }],
          },
        ];

        await provider.registerMany(actions);

        const aliases = provider.unstable_aliases('plugin::bar.foo', 'baz');

        expect(aliases).toHaveLength(1);
        expect(aliases).toStrictEqual(['api::bar']);
      });
    });
  });
});
