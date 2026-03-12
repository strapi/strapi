/**
 * Bidirectional relations need special handling when republishing entries.
 *
 * When republishing an entry (e.g., Tag) that another entry or component has a
 * bidirectional relation to:
 * 1. The old published entry is deleted → FK CASCADE removes join table entries
 * 2. A new published entry is created with a new entity ID
 * 3. bidirectionalRelations.sync() must re-insert the cascade-deleted join entries
 *    pointing to the new entity ID, not just update their order.
 *
 * Without the fix, sync() only does an UPDATE (for order), which affects 0 rows
 * because the entry was deleted. The relation is permanently lost.
 */
import type { Core, UID } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
const builder = createTestBuilder();
let rq;

const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;

// Tag model — the inverse side is auto-created by content-type-builder
// when Product declares inversedBy: 'products'
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

// Product has a bidirectional manyToMany with Tag.
// Using targetAttribute (content-type-builder input format) instead of inversedBy so
// the builder auto-creates the inverse 'products' attribute on Tag.
const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
    tags: {
      type: 'relation',
      relation: 'manyToMany',
      target: TAG_UID,
      targetAttribute: 'products',
    },
  },
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

describe('Document Service bidirectional relations', () => {
  beforeAll(async () => {
    // Tag must be created before Product so Product can reference it via inversedBy.
    // The content-type builder will auto-create the inverse 'products' attribute on Tag.
    await builder.addContentTypes([tagModel]).addContentTypes([productModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction('Sync bidirectional relations on republish of related entry', async () => {
    // Create and publish Tag
    const tag = await strapi.documents(TAG_UID).create({
      data: { name: 'Tag1' },
    });
    await strapi.documents(TAG_UID).publish({ documentId: tag.documentId });

    // Create and publish Product with the tag
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'Product1',
        tags: [{ documentId: tag.documentId }],
      },
    });
    await strapi.documents(PRODUCT_UID).publish({ documentId: product.documentId });

    // Update the tag name and republish it.
    // This creates a new entity ID for the published tag,
    // and cascade-deletes old join entries pointing to old_tag_id.
    await strapi.documents(TAG_UID).update({
      documentId: tag.documentId,
      data: { name: 'Tag1 Updated' },
    });
    const republishedTag = await strapi.documents(TAG_UID).publish({
      documentId: tag.documentId,
    });
    const newTagId = republishedTag.entries[0].id;

    // Fetch published product with populated tags
    const publishedProduct = await strapi.documents(PRODUCT_UID).findOne({
      documentId: product.documentId,
      populate: { tags: true },
      status: 'published',
    });

    // The product should still have the tag, pointing to the new entity ID
    expect(publishedProduct?.tags).toHaveLength(1);
    expect(publishedProduct?.tags[0]).toMatchObject({
      id: newTagId,
      name: 'Tag1 Updated',
    });
  });

  testInTransaction(
    'Removed bidirectional relation not returned after republish of parent',
    async () => {
      // Create and publish two Tags
      const tag1 = await strapi.documents(TAG_UID).create({ data: { name: 'TagA' } });
      const tag2 = await strapi.documents(TAG_UID).create({ data: { name: 'TagB' } });
      await strapi.documents(TAG_UID).publish({ documentId: tag1.documentId });
      await strapi.documents(TAG_UID).publish({ documentId: tag2.documentId });

      // Create and publish Product with both tags
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Product3',
          tags: [{ documentId: tag1.documentId }, { documentId: tag2.documentId }],
        },
      });
      await strapi.documents(PRODUCT_UID).publish({ documentId: product.documentId });

      // Update product draft to remove tag2, then republish
      await strapi.documents(PRODUCT_UID).update({
        documentId: product.documentId,
        data: {
          name: 'Product3',
          tags: [{ documentId: tag1.documentId }],
        },
      });
      await strapi.documents(PRODUCT_UID).publish({ documentId: product.documentId });

      // Fetch published product with populated tags
      const publishedProduct = await strapi.documents(PRODUCT_UID).findOne({
        documentId: product.documentId,
        populate: { tags: true },
        status: 'published',
      });

      // Only tag1 should remain
      expect(publishedProduct?.tags).toHaveLength(1);
      expect(publishedProduct?.tags[0].documentId).toBe(tag1.documentId);
    }
  );

  testInTransaction(
    'Bidirectional relation order is preserved after republish of related entry',
    async () => {
      // Create and publish 3 Tags
      const tagA = await strapi.documents(TAG_UID).create({ data: { name: 'OrderTagA' } });
      const tagB = await strapi.documents(TAG_UID).create({ data: { name: 'OrderTagB' } });
      const tagC = await strapi.documents(TAG_UID).create({ data: { name: 'OrderTagC' } });
      await strapi.documents(TAG_UID).publish({ documentId: tagA.documentId });
      await strapi.documents(TAG_UID).publish({ documentId: tagB.documentId });
      await strapi.documents(TAG_UID).publish({ documentId: tagC.documentId });

      // Create and publish Product with tags in a specific order
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Product4',
          tags: [
            { documentId: tagA.documentId },
            { documentId: tagB.documentId },
            { documentId: tagC.documentId },
          ],
        },
      });
      await strapi.documents(PRODUCT_UID).publish({ documentId: product.documentId });

      // Republish tagB (creates new entity ID, cascade-deletes old join entries)
      await strapi.documents(TAG_UID).update({
        documentId: tagB.documentId,
        data: { name: 'OrderTagB Updated' },
      });
      await strapi.documents(TAG_UID).publish({ documentId: tagB.documentId });

      // Fetch published product with populated tags
      const publishedProduct = await strapi.documents(PRODUCT_UID).findOne({
        documentId: product.documentId,
        populate: { tags: true },
        status: 'published',
      });

      // All 3 tags should still be present after republishing tagB
      expect(publishedProduct?.tags).toHaveLength(3);
      const tagNames = publishedProduct?.tags.map((t) => t.name);
      expect(tagNames).toContain('OrderTagA');
      expect(tagNames).toContain('OrderTagB Updated');
      expect(tagNames).toContain('OrderTagC');
    }
  );
});
