'use strict';

const hooks = require('../hooks');

describe('Hooks Module', () => {
  describe('Internals', () => {
    describe('createHook', () => {
      test(`It's possible to create a hook that has all the needed methods`, () => {
        const hook = hooks.internals.createHook();

        expect(hook).toHaveProperty('getHandlers', expect.any(Function));
        expect(hook).toHaveProperty('register', expect.any(Function));
        expect(hook).toHaveProperty('delete', expect.any(Function));
        expect(hook).toHaveProperty('call', expect.any(Function));
      });

      test('Call is not implemented by default', async () => {
        const hook = hooks.internals.createHook();
        const doCall = () => hook.call('foo');

        expect(doCall).toThrowError('Method not implemented');
      });
    });
  });

  describe('Hooks', () => {
    describe('Async Series Hook', () => {
      test('Can create an async series hook (from factory)', () => {
        const hook = hooks.createAsyncSeriesHook();

        expect(hook).toHaveProperty('register', expect.any(Function));
        expect(hook).toHaveProperty('call', expect.any(Function));
      });

      test('Running a hook without any handler does nothing', async () => {
        const ctx = { foo: 'bar' };
        const hook = hooks.createAsyncSeriesHook();

        await hook.call(ctx);

        expect(ctx).toMatchObject({ foo: 'bar' });
      });

      test('Running a hook with an handler can mutate the context', async () => {
        const ctx = { foo: 'bar' };
        const handler = jest.fn(context => {
          context.foo = 'foo';
        });

        const hook = hooks.createAsyncSeriesHook();

        hook.register(handler);

        await hook.call(ctx);

        expect(handler).toHaveBeenCalled();
        expect(ctx).toHaveProperty('foo', 'foo');
      });

      test('Running a hook with multiple handlers can mutate the hook in order', async () => {
        const ctx = { foo: [] };
        const handlers = [
          jest.fn(context => context.foo.push('foo')),
          jest.fn(context => context.foo.push('bar')),
        ];
        const hook = hooks.createAsyncSeriesHook();

        handlers.forEach(handler => hook.register(handler));

        await hook.call(ctx);

        handlers.forEach(handler => expect(handler).toHaveBeenCalled());
        expect(ctx).toHaveProperty('foo', ['foo', 'bar']);
      });
    });

    describe('Async Series Waterfall Hook', () => {
      test('Can create an async series waterfall hook (from factory)', () => {
        const hook = hooks.createAsyncSeriesWaterfallHook();

        expect(hook).toHaveProperty('register', expect.any(Function));
        expect(hook).toHaveProperty('call', expect.any(Function));
      });

      test('Running a hook without any handler returns the initial param (from hook.call)', async () => {
        const param = 'foo';
        const hook = hooks.createAsyncSeriesWaterfallHook();

        const result = await hook.call(param);

        expect(result).toEqual(param);
      });

      test('Running a hook with an handler can update the final value', async () => {
        const param = 'foo';
        const handler = jest.fn(param => [param, 'bar']);

        const hook = hooks.createAsyncSeriesWaterfallHook();

        hook.register(handler);

        const result = await hook.call(param);

        expect(handler).toHaveBeenCalled();
        expect(result).toEqual(['foo', 'bar']);
      });

      test(`Running a hook with multiple handlers means every handler will receive the previous one's result`, async () => {
        const param = 'foo';
        const handlers = [jest.fn(param => `${param}.bar`), jest.fn(param => `${param}.foobar`)];
        const hook = hooks.createAsyncSeriesWaterfallHook();

        handlers.forEach(handler => hook.register(handler));

        const result = await hook.call(param);

        handlers.forEach(handler => expect(handler).toHaveBeenCalled());
        expect(result).toEqual('foo.bar.foobar');
      });
    });

    describe('Async Parallel Hook', () => {
      test('Can create an async parallel hook (from factory)', () => {
        const hook = hooks.createAsyncParallelHook();

        expect(hook).toHaveProperty('register', expect.any(Function));
        expect(hook).toHaveProperty('call', expect.any(Function));
      });

      test('Running a hook without any handler returns an empty array (from hook.call)', async () => {
        const param = 'foo';
        const hook = hooks.createAsyncParallelHook();

        const result = await hook.call(param);

        expect(result).toEqual([]);
      });

      test('Running a hook with an handler returns its value', async () => {
        const param = 'test';
        const handler = jest.fn(param => `${param}.bar`);

        const hook = hooks.createAsyncParallelHook();

        hook.register(handler);

        const result = await hook.call(param);

        expect(handler).toHaveBeenCalled();
        expect(result).toEqual(['test.bar']);
      });

      test(`Running a hook with multiple handlers return every result as an array`, async () => {
        const param = 'test';
        const handlers = [jest.fn(param => `${param}.foo`), jest.fn(param => `${param}.bar`)];
        const hook = hooks.createAsyncParallelHook();

        handlers.forEach(handler => hook.register(handler));

        const result = await hook.call(param);

        handlers.forEach(handler => expect(handler).toHaveBeenCalled());
        expect(result).toEqual(['test.foo', 'test.bar']);
      });
    });
  });
});
