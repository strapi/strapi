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
    // Under a relation, `populate` is the nested-populate keyword even when the target also has
    // an attribute of that name, so the nested populate is checked against the target, by every
    // validator and sanitizer pass, and not against the attribute's component.
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
          hidden: { type: 'string', private: true },
          populate: { type: 'component', component: 'default.block' },
          secret: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::holder.holder',
            private: true,
          },
          // Not private, but its target is not readable with the auth below.
          forbidden: { type: 'relation', relation: 'manyToOne', target: 'api::holder.holder' },
          other: { type: 'relation', relation: 'manyToOne', target: 'api::target.target' },
        },
      },
      'default.block': {
        uid: 'default.block',
        modelType: 'component',
        attributes: { label: { type: 'string' } },
      },
    };

    const getModel = (uid: string) => models[uid];
    const holderValidators = createAPIValidators({ getModel });
    const holderSanitizers = createAPISanitizers({ getModel });
    const holder = models['api::holder.holder'];
    const auth = { strategy: { name: 'users-permissions' }, credentials: null };

    beforeEach(() => {
      global.strapi = {
        getModel,
        contentTypes: {
          'api::holder.holder': models['api::holder.holder'],
          'api::target.target': models['api::target.target'],
        },
        components: { 'default.block': models['default.block'] },
        auth: {
          async verify(_auth: unknown, { scope }: { scope: string }) {
            if (scope === 'api::holder.holder.find') {
              throw new Error('Forbidden');
            }
          },
        },
      } as any;
    });

    it('walks the nested populate against the target schema', async () => {
      const seen: string[] = [];

      await traverseQueryPopulate(
        ({ key, schema }) => {
          seen.push(`${schema.uid}.${key}`);
        },
        { schema: holder, getModel }
      )({ related: { populate: { other: true } } });

      expect(seen).toEqual([
        'api::holder.holder.related',
        'api::target.target.populate',
        'api::target.target.other',
      ]);
    });

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

    it('accepts relations and fields of the target in the nested populate', async () => {
      await expect(
        holderValidators.populate(
          { related: { populate: { other: true, fields: ['name'] } } },
          holder
        )
      ).resolves.not.toThrow();
    });

    it('sanitization removes a private relation from the nested populate', async () => {
      await expect(
        holderSanitizers.populate(
          { related: { populate: { secret: true, other: true } } },
          holder,
          {
            auth,
          }
        )
      ).resolves.toEqual({ related: { populate: { other: true } } });
    });

    it('sanitization removes a restricted relation from the nested populate', async () => {
      await expect(
        holderSanitizers.populate(
          { related: { populate: { forbidden: true, other: true } } },
          holder,
          { auth }
        )
      ).resolves.toEqual({ related: { populate: { other: true } } });
    });

    it('sanitization checks nested query keywords against the target, not the component', async () => {
      // `name` is a field of the target, `label` only of the component, `hidden` is private.
      await expect(
        holderSanitizers.populate(
          { related: { populate: { fields: ['name', 'label', 'hidden'] } } },
          holder,
          { auth }
        )
      ).resolves.toEqual({ related: { populate: { fields: ['name'] } } });
    });

    it('still populates the attribute itself inside the nested populate', async () => {
      const populate = { related: { populate: { populate: true } } };

      await expect(holderValidators.populate(populate, holder)).resolves.not.toThrow();
      await expect(holderSanitizers.populate(populate, holder, { auth })).resolves.toEqual(
        populate
      );
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
