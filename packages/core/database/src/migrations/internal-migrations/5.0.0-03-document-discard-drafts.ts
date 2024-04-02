/* eslint-disable no-continue */
import { async, contentTypes } from '@strapi/utils';

import type { Database } from '../..';
import type { Migration } from '../common';

type DocumentVersion = { documentId: string; locale: string };

/**
 * Load a batch of versions to discard.
 *
 * Versions with only a draft version will be ignored.
 * Only versions with a published version (which always have a draft version) will be discarded.
 */
async function* getBatchToDiscard({
  db,
  uid,
  batchSize = 1000,
}: {
  db: Database;
  uid: string;
  batchSize?: number;
}) {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Look for the published entries to discard
    const batch: DocumentVersion[] = await db
      .queryBuilder(uid)
      .select(['id', 'documentId', 'locale'])
      .where({ publishedAt: { $ne: null } })
      .limit(batchSize)
      .offset(offset)
      .orderBy('id')
      .execute();

    if (batch.length < batchSize) {
      hasMore = false;
    }

    offset += batchSize;
    yield batch;
  }
}

const migrateUp = async (db: Database) => {
  for (const meta of db.metadata.values()) {
    const model = strapi.getModel(meta.uid);
    const hasDP = contentTypes.hasDraftAndPublish(model);
    if (!hasDP) {
      continue;
    }

    const discardDraft = async (entry: DocumentVersion) => {
      strapi
        .documents(meta.uid)
        // Discard draft by referencing the documentId and locale
        .discardDraft(entry.documentId, { locale: entry.locale });
    };

    /**
     * Load a batch of entries (batched to prevent loading millions of rows at once ),
     * and discard them using the document service.
     */
    for await (const batch of getBatchToDiscard({ db, uid: meta.uid })) {
      await async.map(batch, discardDraft, { concurrency: 10 });
    }
  }
};

/**
 * On V4 there was no concept of document, and an entry could be in a draft or published state.
 * But not both at the same time.
 *
 * On V5 we introduced the concept of document, and an entry can be in a draft or published state,
 * with the requirement that a document must always have a draft.
 *
 * This migration creates the document draft counterpart for all the entries that were in a published state.
 */
export const discardDocumentDrafts: Migration = {
  name: '5.0.0-03-discard drafts',
  async up(_, db) {
    // TODO: Do not await, run this asynchronously
    // TODO: Log to inform the user that the migration is running in the background
    await migrateUp(db);
  },
  async down() {
    throw new Error('not implemented');
  },
};
