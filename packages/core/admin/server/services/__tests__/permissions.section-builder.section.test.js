'use strict';

const createSection = require('../permission/sections-builder/section');

describe('Section', () => {
  test('Creates a new section with the correct properties', () => {
    const section = createSection();

    expect(section.hooks).toMatchObject({
      handlers: expect.any(Object),
      matchers: expect.any(Object),
    });

    expect(section).toHaveProperty('appliesToAction', expect.any(Function));
    expect(section).toHaveProperty('build', expect.any(Function));
  });

  test(`It's possible to register handlers for hooks on section init`, async () => {
    const handler = jest.fn();
    const matcher = jest.fn();

    const section = createSection({ handlers: [handler], matchers: [matcher] });

    await section.hooks.matchers.call();
    await section.hooks.handlers.call();

    expect(handler).toHaveBeenCalled();
    expect(matcher).toHaveBeenCalled();
  });

  test(`It's possible to register handlers for hooks after section init`, async () => {
    const handler = jest.fn();
    const matcher = jest.fn();

    const section = createSection();

    section.hooks.handlers.register(handler);
    section.hooks.matchers.register(matcher);

    await section.hooks.matchers.call();
    await section.hooks.handlers.call();

    expect(handler).toHaveBeenCalled();
    expect(matcher).toHaveBeenCalled();
  });

  describe('appliesToAction', () => {
    test(`If there is no matcher registered, it should return false everytime`, async () => {
      const section = createSection();
      const action = {};

      const applies = await section.appliesToAction(action);

      expect(applies).toBe(false);
    });

    test(`If there is at least one matcher returning true, it should return true`, async () => {
      const action = { foo: 'bar' };
      const matchers = [jest.fn((a) => a.foo === 'bar'), jest.fn((a) => a.bar === 'foo')];
      const section = createSection({ matchers });

      const applies = await section.appliesToAction(action);

      matchers.forEach((matcher) => expect(matcher).toHaveBeenCalledWith(action));
      expect(applies).toBe(true);
    });

    test('If every matcher returns other results than true, it should return false', async () => {
      const action = { foo: 'bar' };
      const matchers = [jest.fn((a) => a.foo === 'foo'), jest.fn((a) => a.bar === 'foo')];
      const section = createSection({ matchers });

      const applies = await section.appliesToAction(action);

      matchers.forEach((matcher) => expect(matcher).toHaveBeenCalledWith(action));
      expect(applies).toBe(false);
    });
  });

  describe('build', () => {
    test('Trying to build the section without any action should return the section initial state', async () => {
      const initialStateFactory = jest.fn(() => ({ foo: 'bar' }));
      const section = createSection({ initialStateFactory });

      const result = await section.build();

      expect(initialStateFactory).toHaveBeenCalled();
      expect(result).toStrictEqual({ foo: 'bar' });
    });

    test('Trying to build the section without any registered matcher should return the section initial state', async () => {
      const initialStateFactory = jest.fn(() => ({ foo: 'bar' }));
      const actions = [{ foo: 'bar' }, { bar: 'foo' }];
      const section = createSection({ initialStateFactory });

      const result = await section.build(actions);

      expect(initialStateFactory).toHaveBeenCalled();
      expect(result).toStrictEqual({ foo: 'bar' });
    });

    test('Trying to build the section without any registered handler should return the section initial state', async () => {
      const initialStateFactory = jest.fn(() => ({ foo: 'bar' }));
      const matchers = [jest.fn(() => true)];
      const actions = [{ foo: 'bar' }, { bar: 'foo' }];
      const section = createSection({ initialStateFactory, matchers });

      const result = await section.build(actions);

      expect(initialStateFactory).toHaveBeenCalled();
      expect(matchers[0]).toHaveBeenCalledTimes(actions.length);
      expect(result).toStrictEqual({ foo: 'bar' });
    });

    test('Building the section with different handlers', async () => {
      const initialStateFactory = jest.fn(() => ({ foo: 'bar' }));
      const matchers = [jest.fn(() => true)];
      const handlers = [
        jest.fn(({ section }) => {
          section.foobar = 1;
        }),
        jest.fn(({ section }) => {
          section.barfoo = 2;
        }),
      ];
      const actions = [{ foo: 'bar' }, { bar: 'foo' }];
      const section = createSection({ initialStateFactory, matchers, handlers });

      const result = await section.build(actions);

      expect(initialStateFactory).toHaveBeenCalled();
      expect(matchers[0]).toHaveBeenCalledTimes(actions.length);
      expect(result).toStrictEqual({ foo: 'bar', foobar: 1, barfoo: 2 });
    });
  });
});
