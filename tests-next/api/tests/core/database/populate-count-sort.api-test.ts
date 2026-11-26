import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  documents,
  queryDb,
  runInServer,
  scaffoldContentType,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';
import type { UID } from '@strapi/types';

import { setupApp, type TestApp } from '../../helpers';

const OTHER_UID: UID.ContentType = 'api::count-sort-other.count-sort-other';
const TAG_UID: UID.ContentType = 'api::count-sort-tag.count-sort-tag';
const ARTICLE_UID: UID.ContentType = 'api::count-sort-article.count-sort-article';

const RELATIONS = ['tags', 'ownTags'] as const;

type Row = { id: number } & Record<string, unknown>;

// A count with a sort must return the count on every database:
// Postgres and MySQL reject an ORDER BY outside the count's GROUP BY,
// and a nested to-many sort breaks the grouped count on every database.
describe('Relation populate count with a sort', () => {
  let ctx: TestApp;
  let article: { id: number };

  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-populate-count-sort',
      scaffold(app) {
        scaffoldContentType(app, {
          displayName: 'count-sort-other',
          singularName: 'count-sort-other',
          pluralName: 'count-sort-others',
          attributes: {
            title: { type: 'string' },
          },
        });
        scaffoldContentType(app, {
          displayName: 'count-sort-tag',
          singularName: 'count-sort-tag',
          pluralName: 'count-sort-tags',
          attributes: {
            name: { type: 'string' },
            others: { type: 'relation', relation: 'manyToMany', target: OTHER_UID },
          },
        });
        scaffoldContentType(app, {
          displayName: 'count-sort-article',
          singularName: 'count-sort-article',
          pluralName: 'count-sort-articles',
          attributes: {
            title: { type: 'string' },
            // manyToMany and oneToMany both count through a join table with a GROUP BY
            tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
            ownTags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
          },
        });
        scaffoldServerScript(app, path.join(__dirname, 'server/populate-count-sort.js'));
      },
    });

    const others = await Promise.all(
      ['a', 'b'].map((title) => queryDb<Row>(ctx.server, OTHER_UID, 'create', { data: { title } }))
    );

    // Each tag links to 2 others, so a join on others would fan out the count
    const tags = await Promise.all(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((name) =>
        queryDb<Row>(ctx.server, TAG_UID, 'create', {
          data: { name, others: others.map((other) => other.id) },
        })
      )
    );

    article = await queryDb<Row>(ctx.server, ARTICLE_UID, 'create', {
      data: {
        title: 'article',
        tags: tags.slice(0, 3).map((tag) => tag.id),
        ownTags: tags.slice(3).map((tag) => tag.id),
      },
    });
  });

  afterAll(stopAllServers);

  describe.each(RELATIONS)('%s', (relation) => {
    test('db query populate count with an orderBy', async () => {
      const res = await queryDb<Row>(ctx.server, ARTICLE_UID, 'findOne', {
        where: { id: article.id },
        populate: { [relation]: { count: true, orderBy: { name: 'desc' } } },
      });

      expect(res[relation]).toEqual({ count: 3 });
    });

    test('db query populate count with a nested to-many orderBy', async () => {
      const res = await queryDb<Row>(ctx.server, ARTICLE_UID, 'findOne', {
        where: { id: article.id },
        populate: { [relation]: { count: true, orderBy: { others: { title: 'asc' } } } },
      });

      expect(res[relation]).toEqual({ count: 3 });
    });

    test('document service populate count with a sort', async () => {
      const res = await documents<Row[]>(ctx.server, ARTICLE_UID, 'findMany', {
        filters: { id: article.id },
        populate: { [relation]: { count: true, sort: 'name:desc' } },
      });

      expect(res).toHaveLength(1);
      expect(res[0][relation]).toEqual({ count: 3 });
    });

    test('entity service load count with a sort', async () => {
      const res = await runInServer(ctx.server, 'populate-count-sort', 'entityServiceLoad', {
        uid: ARTICLE_UID,
        entity: article,
        field: relation,
        params: { count: true, sort: 'name:desc' },
      });

      expect(res).toEqual({ count: 3 });
    });
  });
});
