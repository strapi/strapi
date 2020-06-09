'use strict';

const createConditionsProvider = require('../permission/conditions-provider');

describe('Conditions Provider', () => {
  let provider;

  beforeEach(() => {
    provider = createConditionsProvider();

    jest.spyOn(provider, 'register');
    jest.spyOn(provider, 'has');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Register', () => {
    test('Successfully register a new condition', () => {
      const condition = { key: 'conditionName', value: jest.fn(() => true) };

      provider.register(condition.key, condition.value);

      const res = provider.get(condition.key);

      expect(provider.has).toHaveBeenCalledWith(condition.key);
      expect(res).toBe(condition.value);
      expect(res()).toBeTruthy();
      expect(condition.value).toHaveBeenCalled();
    });

    test('The condition already exists', () => {
      const key = 'conditionName';
      const registerFn = () => provider.register(key, {});

      registerFn();

      expect(registerFn).toThrowError();
      expect(provider.has).toHaveBeenCalledTimes(2);
    });
  });

  describe('Registers Many', () => {
    test('Registers many conditions successfully', () => {
      const conditions = {
        foo: jest.fn(() => 'bar'),
        john: jest.fn(() => 'doe'),
      };

      provider.registerMany(conditions);

      const resFoo = provider.get('foo');
      const resJohn = provider.get('john');

      expect(provider.register).toHaveBeenCalledTimes(2);
      expect(provider.has).toHaveBeenCalledTimes(2);

      expect(resFoo).toBe(conditions.foo);
      expect(resJohn).toBe(conditions.john);

      expect(resFoo()).toBe('bar');
      expect(resJohn()).toBe('doe');

      expect(conditions.foo).toHaveBeenCalled();
      expect(conditions.john).toHaveBeenCalled();
    });

    test('Fails to register already existing conditions', () => {
      const conditions = {
        foo: {},
        john: {},
      };

      const registerFn = () => provider.registerMany(conditions);

      registerFn();

      expect(registerFn).toThrowError();
      expect(provider.register).toHaveBeenCalledTimes(3);
    });
  });

  describe('Conditions', () => {
    test('Returns an array of all the conditions key', () => {
      const conditions = {
        foo: {},
        bar: {},
      };
      const expected = ['bar', 'foo'];

      provider.registerMany(conditions);

      expect(provider.conditions().sort()).toMatchObject(expected);
    });
  });

  describe('Has', () => {
    test('The key exists', () => {
      const key = 'foo';
      provider.register(key, {});

      expect(provider.has(key)).toBeTruthy();
    });

    test(`The key doesn't exists`, () => {
      const key = 'foo';

      expect(provider.has(key)).toBeFalsy();
    });
  });

  describe('Delete', () => {
    test('Delete existing condition', () => {
      const key = 'foo';

      provider.register(key);

      expect(provider.conditions()).toHaveLength(1);

      provider.delete(key);

      expect(provider.has).toHaveBeenCalledWith(key);
      expect(provider.conditions()).toHaveLength(0);
    });

    test('Do nothing when the key does not exists', () => {
      const key = 'foo';

      provider.delete(key);

      expect(provider.has).toHaveBeenCalledWith(key);
      expect(provider.conditions()).toHaveLength(0);
    });
  });
});
