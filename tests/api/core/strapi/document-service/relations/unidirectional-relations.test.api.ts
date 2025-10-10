/**
 * Unidirectional relations need special handling when publishing/un publishing.
 *
 * When publishing or un publishing an entry, other entries with a relation targeting this one might lose its relation.
 * This is only the case with unidirectional relations, but not bidirectional relations.
 */
import type { Core } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
const builder = createTestBuilder();
let rq;

const PRODUCT_UID = 'api::product.product';
const TAG_UID = 'api::tag.tag';
const INNER_COMPONENT_UID = 'default.inner';

const populate = {
  tag: true,
  tags: true,
  compo: {
    populate: {
      tag: true,
      tags: true,
      inner: {
        populate: {
          tags: true,
        },
      },
    },
  },
};

const innerComponentModel = {
  collectionName: 'components_inner',
  attributes: {
    tags: {
      type: 'relation',
      relation: 'oneToMany',
      target: TAG_UID,
    },
  },
  displayName: 'inner',
};

const componentModel = {
  collectionName: 'components_compo',
  attributes: {
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
    inner: {
      type: 'component',
      component: INNER_COMPONENT_UID,
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
      .addComponent(innerComponentModel)
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
        compo: {
          tag: { documentId: 'Tag1' },
          inner: { tags: [{ documentId: 'Tag1' }, { documentId: 'Tag2' }] },
        },
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
      compo: { tag: { id: tag1Id }, inner: { tags: [{ id: tag1Id }, { id: tag2Id }] } },
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
      compo: { tag: { id: tag1Id }, inner: { tags: [{ id: tag1Id }, { id: tag2Id }] } },
    });
  });

  it('Should not create orphaned relations for a draft and publish content-type when updating from the parent side', async () => {
    const joinTableName = 'components_default_compos_tags_lnk';

    // Step 1: Create Product with component tag relation (draft)
    const testProduct = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'GhostRelationBugTest',
        compo: {
          tags: [{ documentId: 'Tag3' }], // Component relation to Tag (still in draft)
        },
      },
    });

    // Check join table after step 1
    let result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    let joinTableRows = Array.isArray(result) ? result : result.rows || result;

    // 1 entry is created for draft to draft
    expect(joinTableRows.length).toBe(1);

    // Step 2: Publish Tag FIRST - this triggers ghost relation creation
    await strapi.documents(TAG_UID).publish({ documentId: 'Tag3' });

    // Check join table after step 2
    result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    joinTableRows = Array.isArray(result) ? result : result.rows || result;

    // No new entry should be created in the join table
    expect(joinTableRows.length).toBe(1);

    // Step 3: Publish Product - creates published component version
    await strapi.documents(PRODUCT_UID).publish({ documentId: testProduct.documentId });

    // Check join table after step 3
    result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    joinTableRows = Array.isArray(result) ? result : result.rows || result;

    // 1 entry should be created (2 total) in the join table for published to published
    expect(joinTableRows.length).toBe(2);

    // Cleanup - Delete the entry
    await strapi.documents(PRODUCT_UID).delete({ documentId: testProduct.documentId });

    result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    joinTableRows = Array.isArray(result) ? result : result.rows || result;
    expect(joinTableRows.length).toBe(0);
  });

  it('Should not create orphaned relations for a draft and publish content-type when updating from the relation side', async () => {
    const joinTableName = 'components_default_compos_tags_lnk';

    // Step 1: Create and publish a tag
    await strapi.documents(TAG_UID).create({
      data: {
        name: 'Tag4',
        documentId: 'Tag4',
      },
    });
    const tag = await strapi.documents(TAG_UID).publish({ documentId: 'Tag4' });
    const tagId = tag.entries[0].id;

    // Step 2: Create Product with component tag relation (published)
    const testProduct = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'GhostRelationBugTest',
        compo: {
          tags: [{ id: tagId }], // Component relation to Tag (published)
        },
      },
    });

    // Step 3: Poublish the product
    await strapi.documents(PRODUCT_UID).publish({ documentId: testProduct.documentId });

    // Check join table after step 1
    let result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    let joinTableRows = Array.isArray(result) ? result : result.rows || result;

    // Expect 2 entries (draft to draft, published to published)
    expect(joinTableRows.length).toBe(2);

    // Step 4: Update the tag and publish
    await strapi.documents(TAG_UID).update({ documentId: 'Tag4', name: 'Tag4 update' });
    await strapi.documents(TAG_UID).publish({ documentId: 'Tag4' });

    // Check join table after step 4
    result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    joinTableRows = Array.isArray(result) ? result : result.rows || result;

    // No new entry should be created in the join table
    expect(joinTableRows.length).toBe(2);

    // Step 5: Republish the parent
    await strapi.documents(PRODUCT_UID).publish({ documentId: testProduct.documentId });

    // Check join table after step 5
    result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    joinTableRows = Array.isArray(result) ? result : result.rows || result;

    // No new entry should be created in the join table
    expect(joinTableRows.length).toBe(2);

    // Cleanup - Delete the entry
    await strapi.documents(PRODUCT_UID).delete({ documentId: testProduct.documentId });

    result = await strapi.db.connection.raw(`SELECT * FROM ${joinTableName}`);
    joinTableRows = Array.isArray(result) ? result : result.rows || result;
    expect(joinTableRows.length).toBe(0);
  });

  // Helpers to resolve the nested component (inner) join table info at runtime
  const getInnerJoinInfo = () => {
    const md: any = (strapi as any).db.metadata.get(INNER_COMPONENT_UID);
    const relation: any = md.attributes?.tags;
    if (!relation?.joinTable?.name) throw new Error('Inner component join table not found');
    const joinTableName = relation.joinTable.name as string;
    const targetColumn = relation.joinTable.inverseJoinColumn.name as string;
    return { joinTableName, targetColumn } as const;
  };

  it('Should not create orphaned relations for nested component when updating from the parent side', async () => {
    const { joinTableName, targetColumn } = getInnerJoinInfo();

    // Step 1: Create Product with nested component tag relation (draft)
    const testProduct = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'NestedGhostRelationParent',
        compo: { inner: { tags: [{ documentId: 'Tag3' }] } },
      },
    });

    // Load Tag3 versions and filter join table rows by Tag3 document ids
    let tag3Versions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'Tag3' } });
    const tag3Draft = tag3Versions.find((t: any) => t.publishedAt === null)!;
    const tag3Published = tag3Versions.find((t: any) => t.publishedAt !== null);

    // 1 entry is created for draft to draft (only draft id exists at this stage)
    let joinTableRows = await strapi.db
      .connection(joinTableName)
      .select('*')
      .whereIn(targetColumn, [tag3Draft.id]);
    expect(joinTableRows.length).toBe(1);

    // Step 2: Publish Tag FIRST
    await strapi.documents(TAG_UID).publish({ documentId: 'Tag3' });

    tag3Versions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'Tag3' } });
    const tag3DraftAfter = tag3Versions.find((t: any) => t.publishedAt === null)!;
    const tag3PubAfter = tag3Versions.find((t: any) => t.publishedAt !== null)!;

    // Still 1 row for Tag3 (should not create extra rows yet)
    joinTableRows = await strapi.db
      .connection(joinTableName)
      .select('*')
      .whereIn(targetColumn, [tag3DraftAfter.id, tag3PubAfter.id]);
    expect(joinTableRows.length).toBe(1);

    // Step 3: Publish Product - creates published component version
    await strapi.documents(PRODUCT_UID).publish({ documentId: testProduct.documentId });

    joinTableRows = await strapi.db
      .connection(joinTableName)
      .select('*')
      .whereIn(targetColumn, [tag3DraftAfter.id, tag3PubAfter.id]);
    expect(joinTableRows.length).toBe(2);

    // Cleanup
    await strapi.documents(PRODUCT_UID).delete({ documentId: testProduct.documentId });
    joinTableRows = await strapi.db
      .connection(joinTableName)
      .select('*')
      .whereIn(targetColumn, [tag3DraftAfter.id, tag3PubAfter.id]);
    expect(joinTableRows.length).toBe(0);
  });

  it('Should not create orphaned relations for nested component when updating from the relation side', async () => {
    const { joinTableName, targetColumn } = getInnerJoinInfo();

    // Step 1: Create and publish a tag
    await strapi.documents(TAG_UID).create({ data: { name: 'Tag5', documentId: 'Tag5' } });
    const tag = await strapi.documents(TAG_UID).publish({ documentId: 'Tag5' });
    const tagPublishedId = tag.entries[0].id;
    const tag5Versions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'Tag5' } });
    const tag5Draft = tag5Versions.find((t: any) => t.publishedAt === null)!;
    const tag5Published = tag5Versions.find((t: any) => t.publishedAt !== null)!;

    // Step 2: Create Product with nested component tag relation (published)
    const testProduct = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'NestedGhostRelationRel',
        compo: { inner: { tags: [{ id: tagPublishedId }] } },
      },
    });

    // Step 3: Publish the product
    await strapi.documents(PRODUCT_UID).publish({ documentId: testProduct.documentId });

    // Expect 2 entries (draft and published) for Tag5 document (either id)
    let joinTableRows = await strapi.db
      .connection(joinTableName)
      .select('*')
      .whereIn(targetColumn, [tag5Draft.id, tag5Published.id]);
    expect(joinTableRows.length).toBe(2);

    // Step 4: Update the tag and publish
    await strapi.documents(TAG_UID).update({ documentId: 'Tag5', name: 'Tag5 update' });
    await strapi.documents(TAG_UID).publish({ documentId: 'Tag5' });

    // Re-fetch Tag5 versions since publish created new ids
    {
      const updatedTag5Versions = await strapi.db
        .query(TAG_UID)
        .findMany({ where: { documentId: 'Tag5' } });
      const newDraft = updatedTag5Versions.find((t: any) => t.publishedAt === null)!;
      const newPublished = updatedTag5Versions.find((t: any) => t.publishedAt !== null)!;

      joinTableRows = await strapi.db
        .connection(joinTableName)
        .select('*')
        .whereIn(targetColumn, [newDraft.id, newPublished.id]);
      expect(joinTableRows.length).toBe(2);
    }

    // Step 5: Republish the parent
    await strapi.documents(PRODUCT_UID).publish({ documentId: testProduct.documentId });

    // Re-check using current Tag5 ids after republishing the parent
    {
      const currentTag5Versions = await strapi.db
        .query(TAG_UID)
        .findMany({ where: { documentId: 'Tag5' } });
      const curDraft = currentTag5Versions.find((t: any) => t.publishedAt === null)!;
      const curPublished = currentTag5Versions.find((t: any) => t.publishedAt !== null)!;

      joinTableRows = await strapi.db
        .connection(joinTableName)
        .select('*')
        .whereIn(targetColumn, [curDraft.id, curPublished.id]);
      expect(joinTableRows.length).toBe(2);
    }

    // Cleanup - Delete the entry
    await strapi.documents(PRODUCT_UID).delete({ documentId: testProduct.documentId });
    joinTableRows = await strapi.db
      .connection(joinTableName)
      .select('*')
      .whereIn(targetColumn, [tag5Draft.id, tag5Published.id]);
    expect(joinTableRows.length).toBe(0);
  });
});
