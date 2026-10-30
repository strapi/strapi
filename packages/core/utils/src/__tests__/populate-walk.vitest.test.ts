/**
 * The populate traversal enters every nested `populate` itself, so the Content API validators
 * and sanitizers must not enter it a second time: doing so doubled the work at every level of
 * nesting.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAPISanitizers } from '../sanitize';
import { traverseQueryPopulate } from '../traverse';
import { createAPIValidators, validators } from '../validate';
import { createStrapiGlobal, getModel as getFixtureModel } from './populate-walk.testdata';

/** `categories -> articles -> categories ...`, `depth` levels of nested `populate`. */
const bareChain = (depth: number): Record<string, unknown> => {
  let populate: Record<string, unknown> = { [depth % 2 === 0 ? 'categories' : 'articles']: true };

  for (let level = depth; level >= 1; level -= 1) {
    populate = { [level % 2 === 0 ? 'articles' : 'categories']: { populate } };
  }

  return populate;
};

/** Every `getModel` call the traversal makes is the entry into one relation's value. */
const countingGetModel = () => {
  const counter = {
    calls: 0,
    getModel(uid: string) {
      counter.calls += 1;
      return getFixtureModel(uid);
    },
  };

  return counter;
};

const article = getFixtureModel('api::article.article');
const DEPTHS = [1, 2, 3, 4, 5, 6];

describe('nested populate is walked once per level', () => {
  const originalStrapi = global.strapi;

  beforeEach(() => {
    global.strapi = createStrapiGlobal();
  });

  afterEach(() => {
    global.strapi = originalStrapi;
  });

  it('builds chains with the expected number of relations', () => {
    expect(bareChain(2)).toEqual({
      categories: { populate: { articles: { populate: { categories: true } } } },
    });
  });

  // A chain of depth d has d + 1 relations, so a pass over it enters d + 1 relation values.
  it.each(DEPTHS)('validation enters each relation once per pass at depth %i', async (depth) => {
    const counter = countingGetModel();

    await createAPIValidators({ getModel: counter.getModel }).populate(bareChain(depth), article);

    // Two passes: the populate checks and the private attribute checks.
    expect(counter.calls).toBe(2 * (depth + 1));
  });

  it.each(DEPTHS)(
    'document service validation enters each relation once at depth %i',
    async (depth) => {
      const counter = countingGetModel();

      await validators.validatePopulate(
        { schema: article, getModel: counter.getModel },
        bareChain(depth),
        { sort: [], filters: [], fields: [] }
      );

      expect(counter.calls).toBe(depth + 1);
    }
  );

  it.each(DEPTHS)('sanitization enters each relation once per pass at depth %i', async (depth) => {
    const counter = countingGetModel();

    await createAPISanitizers({ getModel: counter.getModel }).populate(bareChain(depth), article, {
      auth: { strategy: { name: 'users-permissions' }, credentials: null },
    });

    // Four passes: wildcards, nested query keywords, private attributes, restricted relations.
    expect(counter.calls).toBe(4 * (depth + 1));
  });

  describe('when a schema has an attribute named populate', () => {
    // The traversal walks `populate` as that attribute, so validation still checks the value
    // as a nested populate itself.
    const models: Record<string, any> = {
      'api::holder.holder': {
        uid: 'api::holder.holder',
        modelType: 'contentType',
        attributes: {
          title: { type: 'string' },
          related: { type: 'relation', relation: 'manyToOne', target: 'api::target.target' },
        },
      },
      'api::target.target': {
        uid: 'api::target.target',
        modelType: 'contentType',
        attributes: {
          name: { type: 'string' },
          populate: { type: 'component', component: 'default.block' },
          secret: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::holder.holder',
            private: true,
          },
        },
      },
      'default.block': {
        uid: 'default.block',
        modelType: 'component',
        attributes: { label: { type: 'string' } },
      },
    };

    const holderValidators = createAPIValidators({ getModel: (uid: string) => models[uid] });
    const holder = models['api::holder.holder'];

    it('rejects a private relation in the nested populate', async () => {
      await expect(
        holderValidators.populate({ related: { populate: { secret: true } } }, holder)
      ).rejects.toThrow('Invalid key secret');
    });

    it('checks nested query keywords against the target, not the component', async () => {
      // `label` is a field of the component but not of the target.
      await expect(
        holderValidators.populate({ related: { populate: { fields: ['label'] } } }, holder)
      ).rejects.toThrow('Invalid key label');
    });
  });

  it('a visitor sees every key of a nested populate exactly once', async () => {
    const seen: string[] = [];

    await traverseQueryPopulate(
      ({ path }) => {
        seen.push(path.raw!);
      },
      { schema: article, getModel: getFixtureModel }
    )(bareChain(4));

    expect(seen).toEqual([
      'categories',
      'categories.populate',
      'categories.populate.articles',
      'categories.populate.articles.populate',
      'categories.populate.articles.populate.categories',
      'categories.populate.articles.populate.categories.populate',
      'categories.populate.articles.populate.categories.populate.articles',
      'categories.populate.articles.populate.categories.populate.articles.populate',
      'categories.populate.articles.populate.categories.populate.articles.populate.categories',
    ]);
  });
});
