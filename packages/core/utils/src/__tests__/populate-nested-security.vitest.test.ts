/**
 * The Content API populate checks at the bottom of deeply nested populates (4 to 6 levels of
 * `populate`): private attributes, restricted relations, invalid keys, `fields`, and dynamic zone
 * `on` fragments.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, set } from 'lodash';

import { createAPISanitizers } from '../sanitize';
import { createAPIValidators } from '../validate';
import {
  chain,
  chainLeafPath,
  createStrapiGlobal,
  getModel,
  pageShape,
} from './populate-walk.testdata';

const sanitizers = createAPISanitizers({ getModel });
const validators = createAPIValidators({ getModel });

const article = getModel('api::article.article');
const page = getModel('api::page.page');

const auth = () => ({ strategy: { name: 'users-permissions' }, credentials: null });

const DEPTHS = [4, 5, 6];

/** A populate on articles whose `categories -> articles -> ...` chain ends in `leaf`. */
const deep = (depth: number, leaf: unknown) => ({ categories: chain(depth, leaf) });

/** The value of the leaf in a populate built by `deep(depth, leaf)`. */
const leafOf = (populate: unknown, depth: number) => get(populate, chainLeafPath(depth));

const sanitize = (populate: unknown, withAuth = true) =>
  sanitizers.populate(populate, article, withAuth ? { auth: auth() } : {});

const validate = (populate: unknown, schema = article) => validators.populate(populate, schema);

describe('nested populate checks', () => {
  const originalStrapi = global.strapi;

  beforeEach(() => {
    global.strapi = createStrapiGlobal();
  });

  afterEach(() => {
    global.strapi = originalStrapi;
  });

  describe.each(DEPTHS)('at depth %i', (depth) => {
    describe('private attributes', () => {
      const privateRelation = deep(depth, { populate: { createdBy: true, author: true } });
      const privateMediaRelation = deep(depth, {
        populate: { image: { populate: { folder: true } }, author: true },
      });

      it('are removed by sanitization, with or without auth', async () => {
        for (const withAuth of [true, false]) {
          expect(leafOf(await sanitize(privateRelation, withAuth), depth)).toEqual({
            populate: { author: true },
          });
          expect(leafOf(await sanitize(privateMediaRelation, withAuth), depth)).toEqual({
            populate: { image: { populate: {} }, author: true },
          });
        }
      });

      it('are rejected by validation', async () => {
        await expect(validate(privateRelation)).rejects.toThrow('Invalid key createdBy');
        await expect(validate(privateMediaRelation)).rejects.toThrow('Invalid key folder');
      });

      it('are removed when a nested wildcard expands to them', async () => {
        const wildcard = deep(depth, { populate: { author: { populate: '*' } } });

        const author = leafOf(await sanitize(wildcard), depth).populate.author;

        expect(author.populate).toEqual({ avatar: true, profile: true, articles: true });
      });
    });

    describe('restricted relations', () => {
      const populate = deep(depth, {
        populate: { secret: { populate: { owner: true } }, author: true },
      });

      it('are removed by sanitization with auth', async () => {
        const leaf = leafOf(await sanitize(populate), depth);

        expect(leaf.populate).toEqual({ author: true });
      });

      it('are kept without auth, which only removes private attributes', async () => {
        const leaf = leafOf(await sanitize(populate, false), depth);

        expect(leaf.populate).toEqual({ secret: { populate: { owner: true } }, author: true });
      });

      it('are removed from polymorphic fragments', async () => {
        const morph = deep(depth, {
          populate: {
            image: {
              populate: {
                related: {
                  on: {
                    'api::article.article': { fields: ['title'] },
                    'api::secret.secret': { fields: ['code'] },
                  },
                },
              },
            },
          },
        });

        const related = leafOf(await sanitize(morph), depth).populate.image.populate.related;

        expect(Object.keys(related.on)).toEqual(['api::article.article']);
      });

      it('are left out when a polymorphic relation is populated with true', async () => {
        const morph = deep(depth, { populate: { image: { populate: { related: true } } } });

        const related = leafOf(await sanitize(morph), depth).populate.image.populate.related;

        expect(Object.keys(related.on)).not.toContain('api::secret.secret');
        expect(Object.keys(related.on)).not.toContain('admin::user');
        expect(Object.keys(related.on)).toContain('api::article.article');
      });
    });

    describe('relations named in a nested string or string array', () => {
      it.each([
        ['a string', 'createdBy', {}],
        ['a dot-notation path', 'author.createdBy', {}],
        ['a string array', ['author', 'createdBy'], { populate: ['author'] }],
      ])('drop a private relation named in %s', async (_name, nested, expected) => {
        const populate = deep(depth, { populate: nested });

        for (const withAuth of [true, false]) {
          expect(leafOf(await sanitize(populate, withAuth), depth)).toEqual(expected);
        }

        await expect(validate(populate)).rejects.toThrow('Invalid key createdBy');
      });

      it.each([
        ['a string', 'secret', {}],
        ['a string array', ['author', 'secret'], { populate: ['author'] }],
      ])('drop a relation the auth cannot read named in %s', async (_name, nested, expected) => {
        const populate = deep(depth, { populate: nested });

        expect(leafOf(await sanitize(populate), depth)).toEqual(expected);
        expect(leafOf(await sanitize(populate, false), depth)).toEqual({ populate: nested });
      });
    });

    describe('invalid keys', () => {
      it.each([
        ['an unknown populate key', { populate: { notAnAttribute: true } }, 'notAnAttribute'],
        ['a scalar populate key', { populate: { title: true } }, 'title'],
        ['an unknown key in a dot-notation string', { populate: 'author.notAnAttribute' }, ''],
        ['a media path in a dot-notation string', { populate: 'image.related' }, 'image'],
        ['an unknown filters key', { filters: { notAnAttribute: { $eq: 1 } } }, 'notAnAttribute'],
        ['a private filters key', { filters: { author: { email: { $eq: 'x' } } } }, 'email'],
        ['a password filters key', { filters: { author: { password: { $eq: 'x' } } } }, ''],
        ['an unknown sort key', { sort: { notAnAttribute: 'asc' } }, 'notAnAttribute'],
        ['a private sort key', { sort: ['internalCode:asc'] }, 'internalCode'],
        ['an unknown fields key', { fields: ['notAnAttribute'] }, 'notAnAttribute'],
        ['a private fields key', { fields: ['title', 'internalCode'] }, 'internalCode'],
        ['a root-only key', { status: 'draft' }, 'status'],
        [
          'an unknown fragment target',
          { populate: { dynamic_zone: { on: { 'dz.nope': true } } } },
          '',
        ],
      ])('throw for %s', async (_name, leaf, key) => {
        await expect(validate(deep(depth, leaf))).rejects.toThrow(`Invalid key ${key}`);
      });

      it('pass for a valid populate of the same depth', async () => {
        await expect(
          validate(deep(depth, { populate: { author: true } }))
        ).resolves.toBeUndefined();
      });
    });

    describe('fields', () => {
      // Sets `fields` on every level of the chain: `articleFields` on articles (and on the leaf,
      // which is an article) and `categoryFields` on categories.
      const withFieldsAtEveryLevel = (articleFields: string[], categoryFields: string[]) => {
        const populate = deep(depth, { fields: ['title'] });
        const path = chainLeafPath(depth);
        const levels: Array<{ path: string[]; isArticle: boolean }> = [];

        for (let end = 1; end <= path.length; end += 1) {
          const node = get(populate, path.slice(0, end));

          if (path[end - 1] !== 'populate' && node?.fields) {
            const isArticle = node.fields.includes('title');
            node.fields = isArticle ? articleFields : categoryFields;
            levels.push({ path: path.slice(0, end), isArticle });
          }
        }

        return { populate, levels };
      };

      it.each([
        ['private', ['title', 'internalCode'], ['name', 'internalScore']],
        ['relational', ['title', 'author', 'image'], ['name', 'articles']],
      ])('drop %s attributes at every level', async (_kind, articleFields, categoryFields) => {
        const { populate, levels } = withFieldsAtEveryLevel(articleFields, categoryFields);
        const sanitized = await sanitize(populate);

        // Every relation of the chain, plus the leaf.
        expect(levels).toHaveLength(depth + 1);

        for (const level of levels) {
          expect(get(sanitized, [...level.path, 'fields'])).toEqual(
            level.isArticle ? ['title'] : ['name']
          );
        }
      });

      it('are rejected by validation at the deepest level', async () => {
        await expect(validate(deep(depth, { fields: ['title', 'internalCode'] }))).rejects.toThrow(
          'Invalid key internalCode'
        );
      });
    });

    describe('dynamic zone fragments', () => {
      const fragments = (fragment: Record<string, unknown>) =>
        deep(depth, { populate: { dynamic_zone: { on: fragment } } });

      it('are sanitized', async () => {
        const populate = fragments({
          'dz.related-articles': {
            fields: ['heading'],
            populate: {
              articles: {
                fields: ['title', 'internalCode'],
                populate: { createdBy: true, secret: true, author: true },
              },
            },
          },
          'dz.cta': { populate: { CTAs: { populate: { link: { populate: '*' } } } } },
        });

        const on = leafOf(await sanitize(populate), depth).populate.dynamic_zone.on;

        expect(on['dz.related-articles']).toEqual({
          fields: ['heading'],
          populate: { articles: { fields: ['title'], populate: { author: true } } },
        });
        expect(on['dz.cta']).toEqual({
          populate: { CTAs: { populate: { link: { populate: { page: true, article: true } } } } },
        });
      });

      it('pass validation when every key is valid', async () => {
        const populate = fragments({
          'dz.related-articles': {
            fields: ['heading'],
            populate: { articles: { fields: ['title'] } },
          },
          'dz.cta': { populate: { CTAs: { populate: { link: true } } } },
        });

        await expect(validate(populate)).resolves.toBeUndefined();
      });

      it('are rejected by validation when a fragment has an invalid key', async () => {
        const populate = fragments({
          'dz.related-articles': { populate: { articles: { populate: { notAnAttribute: true } } } },
        });

        await expect(validate(populate)).rejects.toThrow('Invalid key notAnAttribute');
      });

      it('are checked on a LaunchPad-like page', async () => {
        const articles = ['dynamic_zone', 'on', 'dz.related-articles', 'populate', 'articles'];
        const populate = pageShape(depth);
        set(populate, [...articles, 'populate', 'createdBy'], true);
        set(populate, [...articles, 'populate', 'secret'], true);

        const sanitized = await sanitizers.populate(populate, page, { auth: auth() });

        expect(get(sanitized, [...articles, 'populate'])).not.toHaveProperty('createdBy');
        expect(get(sanitized, [...articles, 'populate'])).not.toHaveProperty('secret');
        expect(get(sanitized, [...articles, 'populate'])).toHaveProperty('categories');
        await expect(validators.populate(populate, page)).rejects.toThrow('Invalid key createdBy');
      });
    });
  });
});
