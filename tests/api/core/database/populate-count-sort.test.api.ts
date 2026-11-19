import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

const OTHER_UID = 'api::count-sort-other.count-sort-other';
const TAG_UID = 'api::count-sort-tag.count-sort-tag';
const ARTICLE_UID = 'api::count-sort-article.count-sort-article';

const otherModel = {
  kind: 'collectionType',
  displayName: 'count-sort-other',
  singularName: 'count-sort-other',
  pluralName: 'count-sort-others',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
  },
};

const tagModel = {
  kind: 'collectionType',
  displayName: 'count-sort-tag',
  singularName: 'count-sort-tag',
  pluralName: 'count-sort-tags',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    others: { type: 'relation', relation: 'manyToMany', target: OTHER_UID },
  },
};

const articleModel = {
  kind: 'collectionType',
  displayName: 'count-sort-article',
  singularName: 'count-sort-article',
  pluralName: 'count-sort-articles',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    // manyToMany and oneToMany both count through a join table with a GROUP BY
    tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
    ownTags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
  },
};

const RELATIONS = ['tags', 'ownTags'] as const;

// A count with a sort must return the count on every database:
// Postgres and MySQL reject an ORDER BY outside the count's GROUP BY,
// and a nested to-many sort breaks the grouped count on every database.
describe('Relation populate count with a sort', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let article: { id: number };

  beforeAll(async () => {
    await builder.addContentTypes([otherModel, tagModel, articleModel]).build();

    strapi = await createStrapiInstance();

    const others = await Promise.all(
      ['a', 'b'].map((title) => strapi.db.query(OTHER_UID).create({ data: { title } }))
    );

    // Each tag links to 2 others, so a join on others would fan out the count
    const tags = await Promise.all(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((name) =>
        strapi.db.query(TAG_UID).create({
          data: { name, others: others.map((other) => other.id) },
        })
      )
    );

    article = await strapi.db.query(ARTICLE_UID).create({
      data: {
        title: 'article',
        tags: tags.slice(0, 3).map((tag) => tag.id),
        ownTags: tags.slice(3).map((tag) => tag.id),
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe.each(RELATIONS)('%s', (relation) => {
    test('db query populate count with an orderBy', async () => {
      const res = await strapi.db.query(ARTICLE_UID).findOne({
        where: { id: article.id },
        populate: { [relation]: { count: true, orderBy: { name: 'desc' } } },
      });

      expect(res[relation]).toEqual({ count: 3 });
    });

    test('db query populate count with a nested to-many orderBy', async () => {
      const res = await strapi.db.query(ARTICLE_UID).findOne({
        where: { id: article.id },
        populate: { [relation]: { count: true, orderBy: { others: { title: 'asc' } } } },
      });

      expect(res[relation]).toEqual({ count: 3 });
    });

    test('document service populate count with a sort', async () => {
      const res = await strapi.documents(ARTICLE_UID).findMany({
        filters: { id: article.id },
        populate: { [relation]: { count: true, sort: 'name:desc' } },
      });

      expect(res).toHaveLength(1);
      expect(res[0][relation]).toEqual({ count: 3 });
    });

    test('entity service load count with a sort', async () => {
      const res = await strapi.entityService.load(ARTICLE_UID, article, relation, {
        count: true,
        sort: 'name:desc',
      });

      expect(res).toEqual({ count: 3 });
    });
  });
});
