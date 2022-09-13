'use strict';

const { omit } = require('lodash/fp');
const createConditionProvider = require('../provider');
const domain = require('..');

const providerMethods = [
  'register',
  'registerMany',
  'delete',
  'get',
  'getWhere',
  'values',
  'keys',
  'has',
  'size',
  'clear',
];

describe('Condition Provider', () => {
  beforeEach(() => {
    global.strapi = {
      isLoaded: false,
    };
  });

  test('ConditionProvider is a provider instance', () => {
    const conditionProvider = createConditionProvider();

    expect(conditionProvider).toHaveProperty('hooks', expect.any(Object));

    providerMethods.forEach((methodName) =>
      expect(conditionProvider).toHaveProperty(methodName, expect.any(Function))
    );
  });

  describe('Methods', () => {
    describe('Register', () => {
      test('Can register a new condition using condition attributes', async () => {
        const attributes = {
          name: 'foobar',
          displayName: 'Foo bar',
          plugin: 'foo',
          handler: { foo: 'bar' },
        };
        const expected = omit('name', attributes);
        const id = domain.computeConditionId(attributes);

        const conditionProvider = createConditionProvider();

        await conditionProvider.register(attributes);

        const condition = conditionProvider.get(id);

        expect(condition).not.toHaveProperty('name');
        expect(condition).toHaveProperty('id', id);
        expect(condition).toMatchObject(expected);
      });

      test(`Can't register a condition if strapi is loaded`, async () => {
        global.strapi.isLoaded = true;

        const attributes = {
          name: 'foobar',
          displayName: 'Foo bar',
          plugin: 'foo',
          handler: { foo: 'bar' },
        };

        const conditionProvider = createConditionProvider();

        const register = () => conditionProvider.register(attributes);

        await expect(register()).rejects.toThrowError(
          `You can't register new conditions outside of the bootstrap function.`
        );
      });

      test('Registration hooks are triggered on register', async () => {
        const attributes = {
          name: 'foobar',
          displayName: 'Foo bar',
          plugin: 'foo',
          handler: { foo: 'bar' },
        };

        const willRegister = jest.fn();
        const didRegister = jest.fn();

        const conditionProvider = createConditionProvider();

        conditionProvider.hooks.willRegister.register(willRegister);
        conditionProvider.hooks.didRegister.register(didRegister);

        await conditionProvider.register(attributes);

        expect(willRegister).toHaveBeenCalled();
        expect(didRegister).toHaveBeenCalled();
      });
    });

    describe('Register Many', () => {
      test('Can register multiple condition at once', async () => {
        const attributes = [
          {
            name: 'foobar-A',
            displayName: 'Foo bar A',
            plugin: 'foo',
            handler: { foo: 'bar' },
          },
          {
            name: 'foobar-B',
            displayName: 'Foo bar B',
            plugin: 'foo',
            handler: { foo: 'bar' },
          },
        ];

        const conditionProvider = createConditionProvider();

        await conditionProvider.registerMany(attributes);

        expect(conditionProvider.size()).toBe(attributes.length);
      });

      test('Registering many condition shall trigger the registration hooks multiple time', async () => {
        const attributes = [
          {
            name: 'foobar-A',
            displayName: 'Foo bar A',
            plugin: 'foo',
            handler: { foo: 'bar' },
          },
          {
            name: 'foobar-B',
            displayName: 'Foo bar B',
            plugin: 'foo',
            handler: { foo: 'bar' },
          },
        ];
        const willRegister = jest.fn();
        const didRegister = jest.fn();

        const conditionProvider = createConditionProvider();

        conditionProvider.hooks.willRegister.register(willRegister);
        conditionProvider.hooks.didRegister.register(didRegister);

        await conditionProvider.registerMany(attributes);

        expect(willRegister).toHaveBeenCalledTimes(2);
        expect(didRegister).toHaveBeenCalledTimes(2);
      });
    });
  });
});
