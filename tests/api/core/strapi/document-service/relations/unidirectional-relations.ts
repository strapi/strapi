/**
 * Unidirectional relations need special handling when publishing/un publishing.
 *
 * When publishing or un publishing an entry, other entries with a relation targeting this one might lose its relation.
 * This is only the case with unidirectional relations, but not bidirectional relations.
 */
import { Core } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
const builder = createTestBuilder();
let rq;

const PRODUCT_UID = 'api::product.product';
const TAG_UID = 'api::tag.tag';

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
    },
  },
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const tagModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  description: '',
  collectionName: '',
};

// TODO: Add tests for components
// TODO: Test discard draft
describe('Document Service unidirectional relations', () => {
  beforeAll(async () => {
    await builder.addContentTypes([tagModel, productModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // TAGS
    await strapi.db.query(TAG_UID).createMany({
      data: [
        { documentId: 'Tag1', name: 'Tag1', publishedAt: null },
        { documentId: 'Tag2', name: 'Tag2', publishedAt: null },
        { documentId: 'Tag3', name: 'Tag3', publishedAt: null },
      ],
    });

    // PRODUCTS
    await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'Product1',
        tag: { documentId: 'Tag1' },
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction('X to One', async () => {
    // Publish tag1. Product1 relation should target the new published tag1 id
    const tag1 = await strapi.documents(TAG_UID).publish({ documentId: 'Tag1' });

    const product1 = await strapi
      .documents(PRODUCT_UID)
      .findFirst({ filters: { name: 'Product1' }, populate: ['tag'] });

    expect(product1).toMatchObject({
      name: 'Product1',
      tag: { id: tag1.id },
    });
  });

  testInTransaction.todo('X to Many', async () => {});
});
