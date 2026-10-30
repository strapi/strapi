/**
 * The populate traversal copies the populate it is given, so neither the traversal nor a visitor
 * can write into the caller's object, and the result shares no object with it. The copy is made
 * once per traversal, not again at every nested level.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cloneDeep, isObject } from 'lodash';

import { ValidationError } from '../errors';
import { createAPISanitizers } from '../sanitize';
import { traverseQueryPopulate } from '../traverse';
import { createAPIValidators, validators } from '../validate';
import { chain, corpus, createStrapiGlobal, getModel, pageShape } from './populate-walk.testdata';

const sanitizers = createAPISanitizers({ getModel });
const apiValidators = createAPIValidators({ getModel });
const article = getModel('api::article.article');
const auth = () => ({ strategy: { name: 'users-permissions' }, credentials: null });

const deepFreeze = <T>(value: T): T => {
  if (isObject(value) && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }

  return value;
};

const objectsIn = (value: unknown, found = new Set<object>()) => {
  if (isObject(value) && !found.has(value)) {
    found.add(value);
    Object.values(value).forEach((item) => objectsIn(item, found));
  }

  return found;
};

/**
 * Runs every populate entry point and returns what the ones whose result is used return: the
 * sanitizers and a traversal that sets and removes keys. Callers only use validation for the
 * error it throws, so a validation error is expected for the invalid shapes of the corpus.
 * Any other error, and any error from the sanitizers or the traversal, fails the test.
 */
const runEverything = async (populate: unknown, schema = article) => {
  const validate = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw error;
      }
    }
  };

  await validate(() => apiValidators.populate(populate, schema));
  await validate(() =>
    validators.validatePopulate({ schema, getModel }, populate, { sort: [], filters: [] })
  );

  return [
    await sanitizers.populate(populate, schema, { auth: auth() }),
    await sanitizers.populate(populate, schema),
    await traverseQueryPopulate(
      ({ key, attribute, value }, { set, remove }) => {
        if (attribute?.type === 'relation' && isObject(value)) {
          set(key, { ...value, marked: true });
        }

        if (key === 'image') {
          remove(key);
        }
      },
      { schema, getModel }
    )(populate),
  ];
};

describe('populate traversal copies', () => {
  const originalStrapi = global.strapi;

  beforeEach(() => {
    global.strapi = createStrapiGlobal();
  });

  afterEach(() => {
    global.strapi = originalStrapi;
  });

  it.each(corpus().map((entry) => [entry.name, entry] as const))(
    'never write into the caller populate: %s',
    async (_name, entry) => {
      const before = cloneDeep(entry.populate);
      // Writing into a frozen object throws in strict mode, which these modules are.
      const populate = deepFreeze(entry.populate);

      await runEverything(populate, getModel(entry.uid));

      expect(populate).toEqual(before);
    }
  );

  it.each(corpus().map((entry) => [entry.name, entry] as const))(
    'return no object of the caller populate: %s',
    async (_name, entry) => {
      const callerObjects = objectsIn(entry.populate);

      for (const result of await runEverything(entry.populate, getModel(entry.uid))) {
        for (const object of objectsIn(result)) {
          expect(callerObjects.has(object)).toBe(false);
        }
      }
    }
  );

  it('keep a visitor that writes into its value away from the caller populate', async () => {
    const populate = { categories: chain(4) };
    const before = cloneDeep(populate);

    await traverseQueryPopulate(
      ({ value }) => {
        if (isObject(value) && !Array.isArray(value)) {
          Object.assign(value, { written: true });
        }
      },
      { schema: article, getModel }
    )(populate);

    expect(populate).toEqual(before);
  });

  it('are made once per traversal, not at every nested level', async () => {
    const seen = new Map<string, { value: unknown; data: unknown }>();

    await traverseQueryPopulate(
      ({ path, value, data }) => {
        seen.set(path.raw!, { value, data });
      },
      { schema: article, getModel }
    )({ categories: { populate: { articles: { populate: { categories: true } } } } });

    // The traversal walks into the very value the visitor was shown one level up.
    expect(seen.get('categories.populate')!.data).toBe(seen.get('categories')!.value);
    expect(seen.get('categories.populate.articles')!.data).toBe(
      seen.get('categories.populate')!.value
    );
    expect(seen.get('categories.populate.articles.populate')!.data).toBe(
      seen.get('categories.populate.articles')!.value
    );
  });

  it('give each request its own copy of a shared populate', async () => {
    // LaunchPad and many apps set `ctx.query.populate` from a module-level constant.
    const shared = deepFreeze(pageShape(3));
    const page = getModel('api::page.page');

    const first = (await sanitizers.populate(shared, page, { auth: auth() })) as any;
    const second = (await sanitizers.populate(shared, page, { auth: auth() })) as any;

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.dynamic_zone).not.toBe(second.dynamic_zone);

    // A later step that writes into the first result does not reach the second.
    first.dynamic_zone.on['dz.hero'].filters = { heading: { $eq: 'x' } };
    expect(second.dynamic_zone.on['dz.hero']).not.toHaveProperty('filters');
  });
});
