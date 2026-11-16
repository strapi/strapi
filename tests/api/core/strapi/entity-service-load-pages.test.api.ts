import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

/**
 * `strapi.entityService.loadPages` takes its 5th argument as page notation (`page`, `pageSize`)
 * or offset notation (`start`, `limit`). Offset notation used to be ignored: any `start`/`limit`
 * returned the first 10 related entries.
 */

const TAG_UID = 'api::lp-tag.lp-tag';
const ARTICLE_UID = 'api::lp-article.lp-article';

const TAG_COUNT = 25;

const tagModel = {
  kind: 'collectionType',
  displayName: 'lp-tag',
  singularName: 'lp-tag',
  pluralName: 'lp-tags',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const articleModel = {
  kind: 'collectionType',
  displayName: 'lp-article',
  singularName: 'lp-article',
  pluralName: 'lp-articles',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
  },
};

const tagName = (index: number) => `tag-${String(index).padStart(2, '0')}`;
const tagNames = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, offset) => tagName(from + offset));

const builder = createTestBuilder();
let strapi: Core.Strapi;
let article: { id: number };

const loadTags = async (pagination?: Record<string, number>) => {
  const page = await strapi.entityService!.loadPages(
    ARTICLE_UID as any,
    article as any,
    'tags' as any,
    { sort: 'id:asc' } as any,
    pagination
  );

  return {
    names: page.results.map((tag: { name: string }) => tag.name),
    pagination: page.pagination,
  };
};

describe('Entity service loadPages', () => {
  beforeAll(async () => {
    await builder.addContentTypes([tagModel, articleModel]).build();

    strapi = await createStrapiInstance();

    const tagIds: string[] = [];
    for (let index = 0; index < TAG_COUNT; index += 1) {
      const tag = await strapi.documents(TAG_UID as any).create({ data: { name: tagName(index) } });
      tagIds.push(tag.documentId);
    }

    const created = await strapi
      .documents(ARTICLE_UID as any)
      .create({ data: { title: 'article', tags: tagIds } as any });

    article = { id: created.id as number };
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('offset notation', () => {
    test('returns the entries from start, up to limit', async () => {
      const { names, pagination } = await loadTags({ start: 20, limit: 5 });

      expect(names).toEqual(tagNames(20, 25));
      expect(pagination).toEqual({ start: 20, limit: 5, total: TAG_COUNT });
    });

    test('a start that is not a multiple of limit', async () => {
      const { names, pagination } = await loadTags({ start: 3, limit: 4 });

      expect(names).toEqual(tagNames(3, 7));
      expect(pagination).toEqual({ start: 3, limit: 4, total: TAG_COUNT });
    });

    test('defaults limit to 10 when only start is given', async () => {
      const { names, pagination } = await loadTags({ start: 12 });

      expect(names).toEqual(tagNames(12, 22));
      expect(pagination).toEqual({ start: 12, limit: 10, total: TAG_COUNT });
    });

    test('defaults start to 0 when only limit is given', async () => {
      const { names, pagination } = await loadTags({ limit: 3 });

      expect(names).toEqual(tagNames(0, 3));
      expect(pagination).toEqual({ start: 0, limit: 3, total: TAG_COUNT });
    });

    test('a limit of -1 returns every entry from start', async () => {
      const { names, pagination } = await loadTags({ start: 18, limit: -1 });

      expect(names).toEqual(tagNames(18, 25));
      expect(pagination).toEqual({ start: 18, limit: -1, total: TAG_COUNT });
    });
  });

  describe('page notation', () => {
    test('returns the requested page', async () => {
      const { names, pagination } = await loadTags({ page: 3, pageSize: 5 });

      expect(names).toEqual(tagNames(10, 15));
      expect(pagination).toEqual({ page: 3, pageSize: 5, pageCount: 5, total: TAG_COUNT });
    });

    test('returns the first 10 entries without pagination', async () => {
      const { names, pagination } = await loadTags();

      expect(names).toEqual(tagNames(0, 10));
      expect(pagination).toEqual({ page: 1, pageSize: 10, pageCount: 3, total: TAG_COUNT });
    });
  });
});
