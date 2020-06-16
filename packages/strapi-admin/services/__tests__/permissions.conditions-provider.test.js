'use strict';

const _ = require('lodash');
const createConditionProvider = require('../permission/condition-provider');
const { createCondition, getConditionId } = require('../../domain/condition');

describe('Condition Provider', () => {
  let provider;
  const localTestData = {
    conditions: [
      {
        name: 'foo',
        plugin: 'test',
        category: 'default',
        handler: jest.fn(() => true),
      },
      {
        name: 'john',
        plugin: 'test',
        category: 'default',
        handler: jest.fn(() => false),
      },
    ],
  };

  beforeEach(() => {
    global.strapi = { isLoaded: false };

    provider = createConditionProvider();

    jest.spyOn(provider, 'register');
    jest.spyOn(provider, 'has');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Register', () => {
    test('Cannot register if strapi is already loaded', () => {
      global.strapi.isLoaded = true;

      const condition = localTestData.conditions[0];

      const registerFn = () => provider.register(condition);

      expect(registerFn).toThrowError();
    });

    test('Successfully register a new condition', () => {
      const condition = localTestData.conditions[0];

      provider.register(condition);

      const res = provider.get(condition.name, condition.plugin);

      expect(provider.has).toHaveBeenCalledWith(condition.name, condition.plugin);
      expect(res).toMatchObject(condition);
      expect(res.handler()).toBe(true);
      expect(condition.handler).toHaveBeenCalled();
    });

    test('The condition already exists', () => {
      const condition = localTestData.conditions[0];

      const registerFn = () => provider.register(condition);

      registerFn();

      expect(registerFn).toThrowError();
      expect(provider.has).toHaveBeenCalledTimes(2);
    });
  });

  describe('Registers Many', () => {
    test('Registers many conditions successfully', () => {
      const conditions = localTestData.conditions;

      provider.registerMany(conditions);

      const resFoo = provider.get('foo', 'test');
      const resJohn = provider.get('john', 'test');

      expect(provider.register).toHaveBeenCalledTimes(2);
      expect(provider.has).toHaveBeenCalledTimes(2);

      expect(resFoo).toMatchObject(createCondition(conditions[0]));
      expect(resJohn).toMatchObject(createCondition(conditions[1]));

      expect(resFoo.handler()).toBe(true);
      expect(resJohn.handler()).toBe(false);

      expect(conditions[0].handler).toHaveBeenCalled();
      expect(conditions[1].handler).toHaveBeenCalled();
    });

    test('Fails to register already existing conditions', () => {
      const conditions = localTestData.conditions;

      const registerFn = () => provider.registerMany(conditions);

      registerFn();

      expect(registerFn).toThrowError();
      expect(provider.register).toHaveBeenCalledTimes(3);
    });
  });

  describe('Conditions', () => {
    test('Returns an array of all the conditions key', () => {
      const conditions = localTestData.conditions;

      const expected = ['plugins::test.foo', 'plugins::test.john'];

      provider.registerMany(conditions);

      expect(
        provider
          .getAll()
          .map(_.property('id'))
          .sort()
      ).toMatchObject(expected);
    });
  });

  describe('Has', () => {
    test('The key exists', () => {
      const condition = localTestData.conditions[0];

      provider.register(condition);

      expect(provider.has(condition.name, condition.plugin)).toBeTruthy();
    });

    test(`The key doesn't exists`, () => {
      const { name, plugin } = localTestData.conditions[1];

      expect(provider.has(name, plugin)).toBeFalsy();
    });
  });

  describe('GetById', () => {
    test('Successfully get a condition by its ID', () => {
      const condition = localTestData.conditions[0];

      provider.register(condition);

      const res = provider.getById(getConditionId(condition));

      expect(res).toMatchObject(createCondition(condition));
    });
  });
});
