/**
 * This migration is responsible for creating the draft counterpart for all the entries that were in a published state.
 *
 * In v4, entries could either be in a draft or published state, but not both at the same time.
 * In v5, we introduced the concept of document, and an entry can be in a draft or published state.
 *
 * This means the migration needs to create the draft counterpart if an entry was published.
 *
 * This migration performs the following steps:
 * 1. Creates draft entries for all published entries, without it's components, dynamic zones or relations.
 * 2. Using the document service, discard those same drafts to copy its relations.
 */

/* eslint-disable no-continue */
import type { UID } from '@strapi/types';
import type { Database, Migration } from '@strapi/database';
import { async, contentTypes } from '@strapi/utils';

type DocumentVersion = { documentId: string; locale: string };
type Knex = Parameters<Migration['up']>[0];

/**
 * Copy all the published entries to draft entries, without it's components, dynamic zones or relations.
 * This ensures all necessary draft's exist before copying it's relations.
 */
async function copyPublishedEntriesToDraft({
  db,
  trx,
  uid,
}: {
  db: Database;
  trx: Knex;
  uid: string;
}) {
  // Extract all scalar attributes to use in the insert query
  const meta = db.metadata.get(uid);

  // Get scalar attributes that will be copied over the new draft
  const scalarAttributes = Object.values(meta.attributes).reduce((acc, attribute: any) => {
    if (['id'].includes(attribute.columnName)) {
      return acc;
    }

    if (contentTypes.isScalarAttribute(attribute)) {
      acc.push(attribute.columnName);
    }

    return acc;
  }, [] as string[]);

  /**
   * Query to copy the published entries into draft entries.
   *
   * INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
   * SELECT columnName1, columnName2, columnName3, ...
   * FROM tableName
   */
  await trx
    // INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
    .into(trx.raw(`${meta.tableName} (${scalarAttributes.join(', ')})`))
    .insert((subQb: typeof trx) => {
      // SELECT columnName1, columnName2, columnName3, ...
      subQb
        .select(
          ...scalarAttributes.map((att: string) => {
            // Override 'publishedAt' and 'updatedAt' attributes
            if (att === 'published_at') {
              return trx.raw('NULL as published_at');
            }

            return att;
          })
        )
        .from(meta.tableName)
        // Only select entries that were published
        .whereNotNull('published_at');
    });
}

/**
 * Load a batch of versions to discard.
 *
 * Versions with only a draft version will be ignored.
 * Only versions with a published version (which always have a draft version) will be discarded.
 */
export async function* getBatchToDiscard({
  db,
  trx,
  uid,
  batchSize = 1000,
}: {
  db: Database;
  trx: Knex;
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
      .transacting(trx)
      .execute();

    if (batch.length < batchSize) {
      hasMore = false;
    }

    offset += batchSize;
    yield batch;
  }
}

const migrateUp = async (trx: Knex, db: Database) => {
  for (const meta of db.metadata.values()) {
    const hasTable = await trx.schema.hasTable(meta.tableName);

    if (!hasTable) {
      continue;
    }

    const uid = meta.uid as UID.ContentType;
    const model = strapi.getModel(uid);
    const hasDP = contentTypes.hasDraftAndPublish(model);
    if (!hasDP) {
      continue;
    }

    /**
     * Create plain draft entries for all the entries that were published.
     */
    await copyPublishedEntriesToDraft({ db, trx, uid: meta.uid });

    const discardDraft = async (entry: DocumentVersion) =>
      strapi
        .documents(uid)
        // Discard draft by referencing the documentId and locale
        .discardDraft({ documentId: entry.documentId, locale: entry.locale });

    /**
     * Discard the drafts will copy the relations from the published entries to the newly created drafts.
     *
     * Load a batch of entries (batched to prevent loading millions of rows at once ),
     * and discard them using the document service.
     */
    for await (const batch of getBatchToDiscard({ db, trx, uid: meta.uid })) {
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
  name: 'core::5.0.0-discard-drafts',
  async up(trx, db) {
    // TODO: Log to inform the user that the migration is running in the background
    await migrateUp(trx, db);
  },
  async down() {
    throw new Error('not implemented');
  },
};
