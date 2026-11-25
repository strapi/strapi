import type { Core } from '@strapi/types';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';

const ARTICLE_UID = 'api::nested-trx-article.nested-trx-article';

const articleModel = {
  kind: 'collectionType',
  singularName: 'nested-trx-article',
  pluralName: 'nested-trx-articles',
  displayName: 'Nested transaction article',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
  },
};

type Version = { title: string; published: boolean };

/**
 * A document service write runs in a transaction of its own. Called inside another transaction,
 * its failure must undo what it wrote before it threw, even when the caller catches the error and
 * the outer transaction commits.
 */
describe('Document Service in an outer transaction', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  // Which version creation fails: publish creates a published version, discardDraft a draft
  let failCreateOf: 'published' | 'draft' | undefined;

  beforeAll(async () => {
    await builder.addContentTypes([articleModel]).build();
    strapi = await createStrapiInstance();

    // Publish deletes the old published version, then creates the new one, and discardDraft
    // deletes the draft, then creates a new one: failing the create makes them throw after the
    // delete
    strapi.db.lifecycles.subscribe({
      models: [ARTICLE_UID],
      beforeCreate(event) {
        const published = event.params.data.publishedAt != null;
        if (failCreateOf === 'published' && published === true) {
          throw new Error('Failed to create the published version');
        }
        if (failCreateOf === 'draft' && published === false) {
          throw new Error('Failed to create the draft version');
        }
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  const findVersions = async (documentId: string): Promise<Version[]> => {
    const rows = await strapi.db.query(ARTICLE_UID).findMany({
      where: { documentId },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({ title: row.title, published: row.publishedAt !== null }));
  };

  const createPublishedDocumentWithDraft = async () => {
    const document = await strapi
      .documents(ARTICLE_UID)
      .create({ data: { title: 'Published' } as never });
    await strapi.documents(ARTICLE_UID).publish({ documentId: document.documentId });
    await strapi.documents(ARTICLE_UID).update({
      documentId: document.documentId,
      data: { title: 'Draft' } as never,
    });

    return document.documentId;
  };

  test('a publish that fails after deleting the published version keeps it', async () => {
    const documentId = await createPublishedDocumentWithDraft();
    expect(await findVersions(documentId)).toEqual(
      expect.arrayContaining([
        { title: 'Draft', published: false },
        { title: 'Published', published: true },
      ])
    );

    let publishError: unknown;
    failCreateOf = 'published';
    try {
      await strapi.db.transaction(async () => {
        try {
          await strapi.documents(ARTICLE_UID).publish({ documentId });
        } catch (error) {
          publishError = error;
        }
      });
    } finally {
      failCreateOf = undefined;
    }

    expect(publishError).toMatchObject({ message: 'Failed to create the published version' });
    const versions = await findVersions(documentId);
    expect(versions).toHaveLength(2);
    expect(versions).toEqual(
      expect.arrayContaining([
        { title: 'Draft', published: false },
        { title: 'Published', published: true },
      ])
    );
  });

  test('writes of the outer transaction around the failed publish are committed', async () => {
    const documentId = await createPublishedDocumentWithDraft();

    failCreateOf = 'published';
    try {
      await strapi.db.transaction(async () => {
        await strapi.documents(ARTICLE_UID).update({
          documentId,
          data: { title: 'Draft before publish' } as never,
        });
        try {
          await strapi.documents(ARTICLE_UID).publish({ documentId });
        } catch {
          // The caller handles the failed publish and goes on
        }
      });
    } finally {
      failCreateOf = undefined;
    }

    expect(await findVersions(documentId)).toEqual(
      expect.arrayContaining([
        { title: 'Draft before publish', published: false },
        { title: 'Published', published: true },
      ])
    );
  });
  test('a discardDraft that fails after deleting the draft keeps it', async () => {
    const documentId = await createPublishedDocumentWithDraft();

    let discardError: unknown;
    failCreateOf = 'draft';
    try {
      await strapi.db.transaction(async () => {
        try {
          await strapi.documents(ARTICLE_UID).discardDraft({ documentId });
        } catch (error) {
          discardError = error;
        }
      });
    } finally {
      failCreateOf = undefined;
    }

    expect(discardError).toMatchObject({ message: 'Failed to create the draft version' });
    const versions = await findVersions(documentId);
    expect(versions).toHaveLength(2);
    expect(versions).toEqual(
      expect.arrayContaining([
        { title: 'Draft', published: false },
        { title: 'Published', published: true },
      ])
    );
  });

  test('a failed write does not emit the events it registered', async () => {
    const created: unknown[] = [];
    const stopListening = strapi.eventHub.on('entry.create', (event: unknown) => {
      created.push(event);
    });

    // create with status published emits entry.create for the draft, then publishes it
    failCreateOf = 'published';
    try {
      await strapi.db.transaction(async () => {
        try {
          await strapi.documents(ARTICLE_UID).create({
            data: { title: 'Never created' } as never,
            status: 'published',
          });
        } catch {
          // The caller handles the failed create and goes on
        }
      });
      await strapi.db.settleTransactionHooks();
    } finally {
      failCreateOf = undefined;
      stopListening();
    }

    expect(created).toEqual([]);
    expect(await strapi.db.query(ARTICLE_UID).count({ where: { title: 'Never created' } })).toBe(0);
  });
});
