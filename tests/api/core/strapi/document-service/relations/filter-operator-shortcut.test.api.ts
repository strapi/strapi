/**
 * A relation, media or component filter that is one operator object applies to the target's id
 * (e.g. `{ tag: { $null: true } }` reads as `{ tag: { id: { $null: true } } }`).
 *
 * The database adds this shortcut for https://github.com/strapi/strapi/issues/12225. It throws when
 * the operator is next to other keys, or when there are several operators.
 */
import type { Core, UID } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const TAG_UID = 'api::shortcut-tag.shortcut-tag' as UID.ContentType;
const ARTICLE_UID = 'api::shortcut-article.shortcut-article' as UID.ContentType;
const SEO_UID = 'default.shortcut-seo' as UID.Component;
const LINK_UID = 'default.shortcut-link' as UID.Component;

type Entry = { id: number; documentId: string };

const seoComponent = {
  displayName: 'shortcut-seo',
  attributes: {
    metaTitle: { type: 'string' },
  },
};

const linkComponent = {
  displayName: 'shortcut-link',
  attributes: {
    tag: { type: 'relation', relation: 'oneToOne', target: TAG_UID },
  },
};

const tagModel = {
  kind: 'collectionType',
  singularName: 'shortcut-tag',
  pluralName: 'shortcut-tags',
  displayName: 'Shortcut tag',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const articleModel = {
  kind: 'collectionType',
  singularName: 'shortcut-article',
  pluralName: 'shortcut-articles',
  displayName: 'Shortcut article',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    tag: { type: 'relation', relation: 'manyToOne', target: TAG_UID },
    tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
    cover: { type: 'media', multiple: false },
    seo: { type: 'component', component: SEO_UID },
    links: { type: 'component', component: LINK_UID, repeatable: true },
  },
};

const createFile = (name: string): Promise<Entry> =>
  strapi.db.query('plugin::upload.file').create({
    data: {
      name: `${name}.png`,
      hash: `${name}_hash`,
      ext: '.png',
      mime: 'image/png',
      size: 1,
      provider: 'local',
      url: `/uploads/${name}.png`,
      folderPath: '/',
    },
  });

const findTitles = async (filters: unknown) => {
  // The filter shapes are checked by the type tests of `@strapi/types`, not here
  const articles = await strapi.documents(ARTICLE_UID).findMany({ filters: filters as any });

  return articles.map((article) => article.title).sort();
};

describe('Document Service relation filters with one operator', () => {
  const tags: Record<'t1' | 't2' | 't3', Entry> = {} as any;
  let file: Entry;

  beforeAll(async () => {
    // The link component targets the tag, so the tag comes first
    await builder
      .addContentType(tagModel)
      .addComponent(seoComponent)
      .addComponent(linkComponent)
      .addContentType(articleModel)
      .build();

    strapi = await createStrapiInstance();

    for (const name of ['t1', 't2', 't3'] as const) {
      tags[name] = await strapi.documents(TAG_UID).create({ data: { name } as any });
    }

    file = await createFile('shortcut-cover');

    await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'a1',
        tag: tags.t1.id,
        tags: [tags.t1.id, tags.t2.id],
        cover: file.id,
        seo: { metaTitle: 'a1' },
        links: [{ tag: tags.t1.id }],
      } as any,
    });

    await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'a2',
        tag: tags.t2.id,
        tags: [tags.t3.id],
        links: [{ tag: tags.t2.id }],
      } as any,
    });

    await strapi.documents(ARTICLE_UID).create({
      data: { title: 'a3', seo: { metaTitle: 'a3' } } as any,
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test.each([
    ['relation $eq', () => ({ tag: { $eq: tags.t1.id } }), ['a1']],
    ['relation $ne', () => ({ tag: { $ne: tags.t1.id } }), ['a2']],
    ['relation $in', () => ({ tag: { $in: [tags.t1.id, tags.t2.id] } }), ['a1', 'a2']],
    ['relation $null', () => ({ tag: { $null: true } }), ['a3']],
    ['relation $notNull', () => ({ tag: { $notNull: true } }), ['a1', 'a2']],
    ['to-many relation $in', () => ({ tags: { $in: [tags.t3.id] } }), ['a2']],
    ['to-many relation $null', () => ({ tags: { $null: true } }), ['a3']],
    ['media $eq', () => ({ cover: { $eq: file.id } }), ['a1']],
    ['media $null', () => ({ cover: { $null: true } }), ['a2', 'a3']],
    ['media $notNull', () => ({ cover: { $notNull: true } }), ['a1']],
    ['component $null', () => ({ seo: { $null: true } }), ['a2']],
    ['component $notNull', () => ({ seo: { $notNull: true } }), ['a1', 'a3']],
    ['relation in a component $eq', () => ({ links: { tag: { $eq: tags.t2.id } } }), ['a2']],
    ['relation in a component $in', () => ({ links: { tag: { $in: [tags.t1.id] } } }), ['a1']],
  ])('applies %s to the id', async (_name, filters, expected) => {
    expect(await findTitles(filters())).toEqual(expected);
  });

  test('applies the same filter as the id form', async () => {
    expect(await findTitles({ tag: { $in: [tags.t1.id, tags.t2.id] } })).toEqual(
      await findTitles({ tag: { id: { $in: [tags.t1.id, tags.t2.id] } } })
    );
    expect(await findTitles({ cover: { $null: true } })).toEqual(
      await findTitles({ cover: { id: { $null: true } } })
    );
  });

  test('throws for an operator next to attribute keys', async () => {
    await expect(findTitles({ tag: { $in: [tags.t1.id], name: 't1' } })).rejects.toThrow(
      'Operator and non-operator keys cannot be mixed in a relation where clause'
    );
  });

  test('throws for a lone $not on a relation, which it reads as an operator on the id', async () => {
    // Known gap of the types: `$not` is part of the target's filter type, so this type-checks
    // The message names the column with its join alias, e.g. `t2.name`
    await expect(findTitles({ tag: { $not: { name: 't1' } } })).rejects.toThrow(
      /Undefined attribute level operator \w+\.name/
    );
  });

  test('throws for a group operator next to attribute keys', async () => {
    // Known gap of the types: `$or` and `name` are both part of the target's filter type
    await expect(findTitles({ tag: { $or: [{ name: 't1' }], name: 't2' } })).rejects.toThrow(
      'Operator and non-operator keys cannot be mixed in a relation where clause'
    );
  });

  test('throws for two operators', async () => {
    await expect(findTitles({ tag: { $gt: 1, $lt: 5 } })).rejects.toThrow(
      'Only one operator key is allowed in a relation where clause'
    );
  });
});
