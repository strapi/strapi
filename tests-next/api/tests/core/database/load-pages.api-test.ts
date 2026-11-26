import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  queryDb,
  runInServer,
  scaffoldContentType,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';
import type { UID } from '@strapi/types';

import { setupApp, type TestApp } from '../../helpers';

const TAG_UID: UID.ContentType = 'api::load-pages-tag.load-pages-tag';
const ARTICLE_UID: UID.ContentType = 'api::load-pages-article.load-pages-article';

interface Page {
  results: unknown[];
  pagination: { page: number; pageSize: number; pageCount: number; total: number };
}

describe('Repository.loadPages', () => {
  let ctx: TestApp;
  let article: { id: number };

  const loadPages = (entity: { id: number }, field: string, params: Record<string, unknown>) =>
    runInServer<Page>(ctx.server, 'load-pages', 'loadPages', { entity, field, params });

  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-load-pages',
      scaffold(app) {
        scaffoldContentType(app, {
          displayName: 'load-pages-tag',
          singularName: 'load-pages-tag',
          pluralName: 'load-pages-tags',
          attributes: {
            name: { type: 'string' },
          },
        });
        scaffoldContentType(app, {
          displayName: 'load-pages-article',
          singularName: 'load-pages-article',
          pluralName: 'load-pages-articles',
          attributes: {
            title: { type: 'string' },
            tags: {
              type: 'relation',
              relation: 'manyToMany',
              target: TAG_UID,
            },
          },
        });
        scaffoldServerScript(app, path.join(__dirname, 'server/load-pages.js'));
      },
    });

    const tags = await Promise.all(
      ['a', 'b', 'c'].map((name) =>
        queryDb<{ id: number }>(ctx.server, TAG_UID, 'create', { data: { name } })
      )
    );

    article = await queryDb<{ id: number }>(ctx.server, ARTICLE_UID, 'create', {
      data: { title: 'article', tags: tags.map((tag) => tag.id) },
    });
  });

  afterAll(stopAllServers);

  test('returns a page of the relation', async () => {
    const res = await loadPages(article, 'tags', {
      page: 1,
      pageSize: 2,
    });

    expect(res.results).toHaveLength(2);
    expect(res.pagination).toEqual({ page: 1, pageSize: 2, pageCount: 2, total: 3 });
  });

  test('ignores a count key in the params', async () => {
    // A params object that is reused from elsewhere can carry a count key
    const params = { page: 1, pageSize: 2, count: true };

    const res = await loadPages(article, 'tags', params);

    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results).toHaveLength(2);
    expect(res.pagination).toEqual({ page: 1, pageSize: 2, pageCount: 2, total: 3 });
  });

  test('returns an empty page when the entity does not exist', async () => {
    const res = await loadPages({ id: 999999 }, 'tags', {
      page: 1,
      pageSize: 2,
    });

    expect(res).toEqual({
      results: [],
      pagination: { page: 1, pageSize: 2, pageCount: 0, total: 0 },
    });
  });
});
