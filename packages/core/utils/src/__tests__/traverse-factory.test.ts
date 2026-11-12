import traverseFactory from '../traverse/factory';
import type { Model } from '../types';

/**
 * The factory had no direct test coverage; it was only exercised indirectly through the
 * sanitize and validate suites. These tests pin the behaviour that per-key allocation
 * removal could plausibly break: async support (the loop no longer awaits
 * unconditionally) and the guarantee that a handler mutating the data is observed by the
 * handlers that run after it (transform utils are now shared across keys, while each
 * handler still receives its own context).
 */

const schema = (attributes: Record<string, unknown> = {}): Model =>
  ({
    modelType: 'contentType',
    uid: 'api::test.test',
    kind: 'collectionType',
    info: { displayName: 'Test', singularName: 'test', pluralName: 'tests' },
    attributes,
  }) as unknown as Model;

const getModel = () => schema();

const isPlainObj = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

/**
 * A parser whose `set`/`remove` return new objects, so `out` is reassigned on every
 * mutation. That is what makes a stale context observable if one were ever shared.
 */
const objectParser = () =>
  traverseFactory().parse(isPlainObj, () => ({
    transform: (data: Record<string, unknown>) => ({ ...data }),
    remove(key: string, data: Record<string, unknown>) {
      const copy = { ...data };
      delete copy[key];
      return copy;
    },
    set: (key: string, value: unknown, data: Record<string, unknown>) => ({
      ...data,
      [key]: value,
    }),
    keys: (data: Record<string, unknown>) => Object.keys(data),
    get: (key: string, data: Record<string, unknown>) => data[key],
  }));

describe('traverse factory', () => {
  test('visits every key with a synchronous visitor', async () => {
    const seen: string[] = [];
    const traversal = objectParser();

    const out = await traversal.traverse(
      ({ key }) => {
        seen.push(key);
      },
      { schema: schema({ a: { type: 'string' } }), getModel },
      { a: 1, b: 2 }
    );

    expect(seen).toEqual(['a', 'b']);
    expect(out).toEqual({ a: 1, b: 2 });
  });

  test('awaits an asynchronous visitor before reading the value back', async () => {
    const traversal = objectParser();

    const out = await traversal.traverse(
      async ({ key }, { set }) => {
        await Promise.resolve();
        set(key, 'async-set');
      },
      { schema: schema(), getModel },
      { a: 1 }
    );

    // If the visitor's promise were not awaited, the traversal would return the original.
    expect(out).toEqual({ a: 'async-set' });
  });

  test('a visitor removal is reflected in the result', async () => {
    const traversal = objectParser();

    const out = await traversal.traverse(
      ({ key }, { remove }) => {
        if (key === 'secret') {
          remove(key);
        }
      },
      { schema: schema(), getModel },
      { keep: 1, secret: 2 }
    );

    expect(out).toEqual({ keep: 1 });
  });

  test('awaits asynchronous handler predicates and handlers', async () => {
    const calls: string[] = [];
    const traversal = objectParser().on(
      async ({ key }) => {
        await Promise.resolve();
        return key === 'a';
      },
      async (_ctx, { set }) => {
        await Promise.resolve();
        calls.push('handler');
        set('a', 'handled');
      }
    ).traverse;

    const out = await traversal(() => {}, { schema: schema(), getModel }, { a: 1 });

    expect(calls).toEqual(['handler']);
    expect(out).toEqual({ a: 'handled' });
  });

  test('a later handler observes data written by an earlier one', async () => {
    // The reason each handler still gets a freshly built context: `set` replaces `out`,
    // and a shared context would leave subsequent handlers reading the pre-write object.
    const observed: unknown[] = [];

    const traversal = objectParser()
      .on(
        ({ key }) => key === 'a',
        (_ctx, { set }) => {
          set('a', 'written-by-first');
        }
      )
      .on(
        ({ key }) => key === 'a',
        (ctx) => {
          observed.push((ctx.data as Record<string, unknown>).a);
        }
      ).traverse;

    await traversal(() => {}, { schema: schema(), getModel }, { a: 'original' });

    expect(observed).toEqual(['written-by-first']);
  });

  test('builds raw and attribute paths, appending attribute only for known keys', async () => {
    const paths: Array<{ raw: string | null; attribute: string | null }> = [];
    const traversal = objectParser();

    await traversal.traverse(
      ({ path }) => {
        paths.push({ raw: path.raw, attribute: path.attribute });
      },
      { schema: schema({ known: { type: 'string' } }), getModel },
      { known: 1, unknown: 2 }
    );

    expect(paths).toEqual([
      { raw: 'known', attribute: 'known' },
      // `unknown` is not an attribute, so the attribute path does not grow.
      { raw: 'unknown', attribute: null },
    ]);
  });

  test('returns data untouched when no parser matches', async () => {
    const traversal = traverseFactory();
    const visitor = jest.fn();

    const out = await traversal.traverse(visitor, { schema: schema(), getModel }, { a: 1 });

    expect(out).toEqual({ a: 1 });
    expect(visitor).not.toHaveBeenCalled();
  });
});
