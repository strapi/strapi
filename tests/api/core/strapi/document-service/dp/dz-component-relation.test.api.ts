'use strict';

import { Core } from '@strapi/types';
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';

const article = {
  kind: 'collectionType',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const category = {
  kind: 'collectionType',
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  attributes: {
    dz: {
      type: 'dynamiczone',
      components: ['default.component-with-relation'],
    },
  },
};
const componentWithOneToManyRelation = {
  displayName: 'component-with-relation',
  attributes: {
    name: {
      type: 'string',
    },
    articles: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::article.article',
    },
  },
};

let strapi: Core.Strapi;
let rq;

describe('Dynamic zone with component containing relation', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentType(article)
      .addComponent(componentWithOneToManyRelation)
      .addContentType(category)
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const article1 = await strapi.documents('api::article.article').create({
      data: {
        title: 'Article 1',
      },
    });

    await strapi.documents('api::article.article').publish({
      documentId: article1.documentId,
    });

    await strapi.documents('api::category.category').create({
      data: {
        dz: [
          {
            __component: 'default.component-with-relation',
            articles: [article1.documentId],
            name: 'TEST DZ',
          },
        ],
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('returns only published documents', async () => {
    const { body } = await rq({
      method: 'GET',
      url: `/categories`,
      qs: {
        populate: {
          dz: {
            on: {
              'default.component-with-relation': {
                populate: '*',
              },
            },
          },
        },
      },
    });

    expect(body.data[0].dz[0].articles.length).toBe(1);
    expect(body.data[0].dz[0].articles.every((article) => article.publishedAt)).toBe(true);
  });
});
