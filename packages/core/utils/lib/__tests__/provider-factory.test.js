'use strict';

const providerFactory = require('../provider-factory');

const providerMethods = [
  'register',
  'delete',
  'get',
  'getWhere',
  'values',
  'keys',
  'has',
  'size',
  'clear',
];

describe('Provider Factory', () => {
  describe('Core', () => {
    test('Can create a default provider', () => {
      const provider = providerFactory();

      expect(provider).toHaveProperty('hooks', expect.any(Object));

      providerMethods.forEach((methodName) =>
        expect(provider).toHaveProperty(methodName, expect.any(Function))
      );
    });
  });

  describe('Hooks', () => {
    test.each(['willRegister'])(
      'AsyncSeries: %s hook can be triggered and mutate the given context',
      async (hookName) => {
        const provider = providerFactory();
        const ctx = { bar: 'foo' };

        const handler = jest.fn((context) => {
          context.foo = 'bar';
        });

        provider.hooks[hookName].register(handler);

        await provider.hooks[hookName].call(ctx);

        expect(handler).toHaveBeenCalled();
        expect(ctx).toEqual({ bar: 'foo', foo: 'bar' });
      }
    );

    test.each(['didRegister', 'willDelete', 'didDelete'])(
      'AsyncParallel: %s hook can be triggered, but cannot mutate the given context',
      async (hookName) => {
        const provider = providerFactory();
        const ctx = { bar: 'foo' };

        const handler = jest.fn((context) => {
          context.foo = 'bar';
          return context;
        });

        provider.hooks[hookName].register(handler);

        const results = await provider.hooks[hookName].call(ctx);

        expect(handler).toHaveBeenCalled();
        expect(results).toEqual([{ foo: 'bar', bar: 'foo' }]);
        expect(ctx).toEqual({ bar: 'foo' });
      }
    );
  });

  describe('Methods', () => {
    describe('Register', () => {
      test('Can register a new item', async () => {
        const provider = providerFactory();
        const key = 'key';
        const item = { foo: 'bar' };

        await provider.register(key, item);

        expect(provider.get(key)).toEqual(item);
      });

      test(`Can't register duplicated key by default`, async () => {
        const provider = providerFactory();

        const key = 'key';
        const itemA = { foo: 'bar' };
        const itemB = { bar: 'foo' };

        await provider.register(key, itemA);

        await expect(provider.register(key, itemB)).rejects.toThrowError(
          'Duplicated item key: key'
        );
      });

      test('Can register duplicated key when "throwOnDuplicates" is false', async () => {
        const provider = providerFactory({ throwOnDuplicates: false });
        const key = 'key';
        const itemA = { foo: 'bar' };
        const itemB = { bar: 'foo' };

        await provider.register(key, itemA);

        expect(provider.get(key)).toEqual(itemA);

        await provider.register(key, itemB);

        expect(provider.get(key)).toEqual(itemB);
      });

      test('Register hooks are triggered on item registration', async () => {
        const willRegister = jest.fn(({ value }) => {
          value.bar = 'foo';
        });
        const didRegister = jest.fn();

        const key = 'key';
        const item = { foo: 'bar' };

        const provider = providerFactory();

        provider.hooks.willRegister.register(willRegister);
        provider.hooks.didRegister.register(didRegister);

        await provider.register(key, item);

        expect(willRegister).toHaveBeenCalledWith({ key, value: item });
        expect(didRegister).toHaveBeenCalledWith({ key, value: item });
        expect(item).toMatchObject({ foo: 'bar', bar: 'foo' });
      });
    });

    describe('Delete', () => {
      const key = 'key';
      const item = { foo: 'bar' };

      test('Can delete a registered item by its key', async () => {
        const provider = providerFactory();

        await provider.register(key, item);

        expect(provider.get(key)).toBe(item);

        await provider.delete(key, item);

        expect(provider.get(key)).toBeUndefined();
      });

      test('Trying to delete an unregistered item does nothing', async () => {
        const provider = providerFactory();

        expect(provider.get(key)).toBeUndefined();

        await provider.delete(key);

        expect(provider.get(key)).toBeUndefined();

        await provider.register(key, item);

        expect(provider.get(key)).toBe(item);

        await provider.delete(`${key}.${key}`);

        expect(provider.get(key)).toBe(item);
      });

      test('Register hooks are triggered on item registration', async () => {
        const willDelete = jest.fn();
        const didDelete = jest.fn();

        const provider = providerFactory();

        provider.hooks.willDelete.register(willDelete);
        provider.hooks.didDelete.register(didDelete);

        await provider.register(key, item);
        await provider.delete(key);

        expect(willDelete).toHaveBeenCalledWith({ key, value: item });
        expect(didDelete).toHaveBeenCalledWith({ key, value: item });
        expect(item).toEqual({ foo: 'bar' });
      });
    });

    describe('Get', () => {
      test('calling get on an existing key returns the registered item', async () => {
        const provider = providerFactory();
        const key = 'key';
        const item = { foo: 'bar' };

        await provider.register(key, item);

        const result = provider.get(key);

        expect(result).toBe(item);
      });

      test('Calling get on a non-existing key returns undefined', () => {
        const provider = providerFactory();

        const result = provider.get('key');

        expect(result).toBeUndefined();
      });
    });

    describe('GetWhere', () => {
      const items = [
        { key: 'keyA', value: { foo: 'barA', bar: 'foo1' } },
        { key: 'keyB', value: { foo: 'barB', bar: 'foo2' } },
        { key: 'keyC', value: { foo: 'barC', bar: 'foo1' } },
        { key: 'keyD', value: { foo: 'barD', bar: 'foo2' } },
      ];
      const provider = providerFactory();

      const sortItems = (a, b) => (a.key < b.key ? -1 : 1);
      const pickItems = (...indexes) => indexes.map((index) => items[index].value);

      beforeAll(async () => {
        for (const item of items) {
          await provider.register(item.key, item.value);
        }
      });

      test('Calling getWhere without filters returns every registered items', async () => {
        const expected = items.map((i) => i.value).sort(sortItems);

        const results = provider.getWhere();

        expect(results).toStrictEqual(expect.any(Array));
        expect(results).toHaveLength(items.length);
        expect(results.sort(sortItems)).toEqual(expected);
      });

      test.each([
        [{ foo: 'barA' }, pickItems(0)],
        [{ bar: 'foo1' }, pickItems(0, 2)],
        [{ bar: 'foo2' }, pickItems(1, 3)],
        [{ foo: 'barD', bar: 'foo2' }, pickItems(3)],
        [{ foo: 'barC', bar: 'foo2' }, []],
        [{ foobar: 'foobar' }, []],
        [{}, pickItems(0, 1, 2, 3)],
      ])('Filters %s', (filters, expected) => {
        const results = provider.getWhere(filters);

        expect(results).toStrictEqual(expect.any(Array));
        expect(results).toStrictEqual(expected);
      });
    });

    describe('Values', () => {
      test('Returns an empty array when there is no registered item', async () => {
        const provider = providerFactory();

        const values = provider.values();

        expect(values).toStrictEqual(expect.any(Array));
        expect(values).toHaveLength(0);
      });

      test('Returns every registered item (only the value, not the key)', async () => {
        const provider = providerFactory();
        const items = [
          { key: 'keyA', value: { foo: 'barA', bar: 'foo1' } },
          { key: 'keyB', value: { foo: 'barB', bar: 'foo2' } },
          { key: 'keyC', value: { foo: 'barC', bar: 'foo1' } },
          { key: 'keyD', value: { foo: 'barD', bar: 'foo2' } },
        ];

        for (const item of items) {
          await provider.register(item.key, item.value);
        }

        const values = provider.values();

        expect(values).toStrictEqual(items.map((item) => item.value));
      });
    });

    describe('Keys', () => {
      test('Returns an empty array when there is no registered item', async () => {
        const provider = providerFactory();

        const keys = provider.keys();

        expect(keys).toStrictEqual(expect.any(Array));
        expect(keys).toHaveLength(0);
      });

      test('Returns every registered item (only the key, not the value)', async () => {
        const provider = providerFactory();
        const items = [
          { key: 'keyA', value: { foo: 'barA', bar: 'foo1' } },
          { key: 'keyB', value: { foo: 'barB', bar: 'foo2' } },
          { key: 'keyC', value: { foo: 'barC', bar: 'foo1' } },
          { key: 'keyD', value: { foo: 'barD', bar: 'foo2' } },
        ];

        for (const item of items) {
          await provider.register(item.key, item.value);
        }

        const keys = provider.keys();

        expect(keys).toStrictEqual(items.map((item) => item.key));
      });
    });

    describe('Has', () => {
      const provider = providerFactory();
      const key = 'key';
      const item = { foo: 'bar' };

      beforeAll(async () => {
        await provider.register(key, item);
      });

      test.each([
        [key, true],
        ['foo', false],
      ])('Has %s => %s', (key, expected) => {
        const result = provider.has(key);

        expect(result).toBe(expected);
      });
    });

    describe('Size', () => {
      test.each([
        ['No item', []],
        ['One item', [{ key: 'key', value: { foo: 'bar' } }]],
        [
          'Multiple items',
          [
            { key: 'keyA', value: { foo: 'bar' } },
            { key: 'keyB', value: { foo: 'bar' } },
            { key: 'keyC', value: { foo: 'bar' } },
          ],
        ],
      ])('%s', async (name, items) => {
        const provider = providerFactory();

        for (const item of items) {
          await provider.register(item.key, item.value);
        }

        const size = provider.size();

        expect(size).toBe(items.length);
      });
    });

    describe('Clear', () => {
      test('Does nothing when there is no registered item', async () => {
        const provider = providerFactory();

        expect(provider.size()).toBe(0);

        await provider.clear();

        expect(provider.size()).toBe(0);
      });

      test('Delete every registered item', async () => {
        const provider = providerFactory();
        const items = [
          { key: 'keyA', value: { foo: 'barA' } },
          { key: 'keyB', value: { foo: 'barB' } },
          { key: 'keyC', value: { foo: 'barC' } },
        ];

        for (const item of items) {
          await provider.register(item.key, item.value);
        }

        expect(provider.size()).toBe(items.length);

        await provider.clear();

        expect(provider.size()).toBe(0);
      });

      test('Delete hooks are triggered for every item on clear', async () => {
        const willDelete = jest.fn();
        const didDelete = jest.fn();

        const provider = providerFactory();

        provider.hooks.willDelete.register(willDelete);
        provider.hooks.didDelete.register(didDelete);

        const items = [
          { key: 'keyA', value: { foo: 'barA' } },
          { key: 'keyB', value: { foo: 'barB' } },
          { key: 'keyC', value: { foo: 'barC' } },
        ];

        for (const item of items) {
          await provider.register(item.key, item.value);
        }

        expect(provider.size()).toBe(items.length);

        await provider.clear();

        expect(provider.size()).toBe(0);

        expect(willDelete).toHaveBeenCalledTimes(items.length);
        expect(didDelete).toHaveBeenCalledTimes(items.length);
      });
    });
  });
});
