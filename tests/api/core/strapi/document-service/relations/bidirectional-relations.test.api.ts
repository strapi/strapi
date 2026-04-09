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

const ARTICLE_UID = 'api::article.article' as UID.ContentType;
const AUTHOR_UID = 'api::author.author' as UID.ContentType;
const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;

const articleModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

const authorModel = {
  attributes: {
    name: {
      type: 'string',
    },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: ARTICLE_UID,
      targetAttribute: 'authors',
    },
  },
  draftAndPublish: true,
  displayName: 'Author',
  singularName: 'author',
  pluralName: 'authors',
  description: '',
  collectionName: '',
};

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
    await builder
      .addContentTypes([articleModel, authorModel, tagModel])
      .addContentTypes([productModel])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'Relation order is preserved after unpublish and republish of a related entry',
    async () => {
      // Create authors out of alphabetical order so correct ordering is not an accident of id sort
      const authorC = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author C' },
      });
      const authorA = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author A' },
      });
      const authorB = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author B' },
      });

      // Step 2: Create Article with relations to all three authors in order (not creation order)
      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Test Article',
          authors: [
            { documentId: authorA.documentId },
            { documentId: authorB.documentId },
            { documentId: authorC.documentId },
          ],
        },
      });

      // Step 3: Publish everything (authors in non-alphabetical publish order, then article)
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorC.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorA.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorB.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      // Step 4: Verify Article published shows A, B, C in order
      let publishedArticle = await strapi.documents(ARTICLE_UID).findFirst({
        filters: { title: 'Test Article' },
        populate: { authors: true },
        status: 'published',
      });

      expect(publishedArticle?.authors).toHaveLength(3);
      expect(publishedArticle?.authors?.map((a: any) => a.name)).toEqual([
        'Author A',
        'Author B',
        'Author C',
      ]);

      // Step 5: Unpublish Author B
      await strapi.documents(AUTHOR_UID).unpublish({ documentId: authorB.documentId });

      // Step 6: Republish Author B
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorB.documentId });

      // Step 7: Verify Article published relations still show A, B, C in correct order
      publishedArticle = await strapi.documents(ARTICLE_UID).findFirst({
        filters: { title: 'Test Article' },
        populate: { authors: true },
        status: 'published',
      });

      expect(publishedArticle?.authors).toHaveLength(3);
      expect(publishedArticle?.authors?.map((a: any) => a.name)).toEqual([
        'Author A',
        'Author B',
        'Author C',
      ]);
    }
  );

  /**
   * Publishing articles and authors in an interleaved order must preserve join-table order for
   * `author.articles` when draft data is already correct (related authors may still be draft
   * when some articles publish first).
   */
  testInTransaction(
    'interleaved article/author publishes: author-side article order should match draft',
    async () => {
      const articleTitlesOnAuthor = (authorEntry: any) =>
        (authorEntry?.articles as any[])?.map((a: any) => a.title) ?? [];

      const periphZ = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-periph-Z' },
      });
      const periphM = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-periph-M' },
      });
      const periphA = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-periph-A' },
      });

      const authZ = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'ix-auth-Z' },
      });
      const authM = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'ix-auth-M' },
      });
      const authA = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'ix-auth-A' },
      });

      const hub = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-hub-main' },
      });

      await strapi.documents(ARTICLE_UID).update({
        documentId: hub.documentId,
        data: {
          authors: {
            set: [
              { documentId: authM.documentId },
              { documentId: authZ.documentId },
              { documentId: authA.documentId },
            ],
          },
        } as any,
      });

      await strapi.documents(AUTHOR_UID).update({
        documentId: authZ.documentId,
        data: {
          articles: {
            set: [
              { documentId: periphA.documentId },
              { documentId: hub.documentId },
              { documentId: periphM.documentId },
            ],
          },
        } as any,
      });
      await strapi.documents(AUTHOR_UID).update({
        documentId: authM.documentId,
        data: {
          articles: {
            set: [
              { documentId: hub.documentId },
              { documentId: periphZ.documentId },
              { documentId: periphA.documentId },
            ],
          },
        } as any,
      });
      await strapi.documents(AUTHOR_UID).update({
        documentId: authA.documentId,
        data: {
          articles: {
            set: [
              { documentId: periphZ.documentId },
              { documentId: periphM.documentId },
              { documentId: hub.documentId },
            ],
          },
        } as any,
      });

      const draftAuthZ = await strapi.documents(AUTHOR_UID).findFirst({
        filters: { name: 'ix-auth-Z' },
        populate: { articles: true },
        status: 'draft',
      });
      const expectedAuthZ = ['ix-periph-A', 'ix-hub-main', 'ix-periph-M'];
      expect(articleTitlesOnAuthor(draftAuthZ)).toEqual(expectedAuthZ);

      // Intentionally interleave: some articles publish before all authors are published.
      await strapi.documents(ARTICLE_UID).publish({ documentId: periphM.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authA.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: periphA.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authZ.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: periphZ.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authM.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: hub.documentId });

      const publishedAuthZ = await strapi.documents(AUTHOR_UID).findFirst({
        filters: { name: 'ix-auth-Z' },
        populate: { articles: true },
        status: 'published',
      });

      expect(articleTitlesOnAuthor(publishedAuthZ)).toEqual(expectedAuthZ);
    }
  );

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

      // All 3 tags should still be present in the original order after republishing tagB
      expect(publishedProduct?.tags.map((t) => t.name)).toEqual([
        'OrderTagA',
        'OrderTagB Updated',
        'OrderTagC',
      ]);
    }
  );
});
