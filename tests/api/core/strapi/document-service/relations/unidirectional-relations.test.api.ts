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

const populate = {
  tag: true,
  tags: true,
  compo: {
    populate: {
      tag: true,
    },
  },
};

const componentModel = {
  attributes: {
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
    },
  },
  displayName: 'compo',
};

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
    tags: {
      type: 'relation',
      relation: 'oneToMany',
      target: TAG_UID,
    },
    compo: {
      type: 'component',
      component: 'default.compo',
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

describe('Document Service unidirectional relations', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([tagModel])
      .addComponent(componentModel)
      .addContentTypes([productModel])
      .build();

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
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'Product1',
        tag: { documentId: 'Tag1' },
        tags: [{ documentId: 'Tag1' }, { documentId: 'Tag2' }],
        compo: { tag: { documentId: 'Tag1' } },
      },
    });

    // Publish tag1
    await strapi.documents(TAG_UID).publish({ documentId: 'Tag1' });
    await strapi.documents(TAG_UID).publish({ documentId: 'Tag2' });

    // Publish product
    await strapi.documents(PRODUCT_UID).publish({ documentId: product.documentId });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction('Sync unidirectional relations on publish', async () => {
    // Publish tag. Product1 relations should target the new published tags id
    const tag1 = await strapi.documents(TAG_UID).publish({ documentId: 'Tag1' });
    const tag1Id = tag1.entries[0].id;
    const tag2 = await strapi.documents(TAG_UID).publish({ documentId: 'Tag2' });
    const tag2Id = tag2.entries[0].id;

    const product1 = await strapi
      .documents(PRODUCT_UID)
      .findFirst({ filters: { name: 'Product1' }, populate, status: 'published' });

    expect(product1).toMatchObject({
      name: 'Product1',
      tag: { id: tag1Id },
      tags: [{ id: tag1Id }, { id: tag2Id }],
      compo: { tag: { id: tag1Id } },
    });
  });

  testInTransaction('Sync unidirectional relations on discard', async () => {
    // Discard tag. Product1 relations should target the new draft tags id
    await strapi.documents(TAG_UID).publish({ documentId: 'Tag1' });
    const tag1 = await strapi.documents(TAG_UID).discardDraft({ documentId: 'Tag1' });
    const tag1Id = tag1.entries[0].id;

    await strapi.documents(TAG_UID).publish({ documentId: 'Tag2' });
    const tag2 = await strapi.documents(TAG_UID).discardDraft({ documentId: 'Tag2' });
    const tag2Id = tag2.entries[0].id;

    const product1 = await strapi
      .documents(PRODUCT_UID)
      .findFirst({ filters: { name: 'Product1' }, populate, status: 'draft' });

    expect(product1).toMatchObject({
      name: 'Product1',
      tag: { id: tag1Id },
      tags: [{ id: tag1Id }, { id: tag2Id }],
      compo: { tag: { id: tag1Id } },
    });
  });
});
