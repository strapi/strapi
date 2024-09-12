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
 * Check if the model has draft and publish enabled.
 */
const hasDraftAndPublish = async (trx: Knex, meta: any) => {
  const hasTable = await trx.schema.hasTable(meta.tableName);

  if (!hasTable) {
    return false;
  }

  const uid = meta.uid as UID.ContentType;
  const model = strapi.getModel(uid);
  const hasDP = contentTypes.hasDraftAndPublish(model);
  if (!hasDP) {
    return false;
  }

  return true;
};

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
    .into(
      trx.raw(`?? (${scalarAttributes.map(() => `??`).join(', ')})`, [
        meta.tableName,
        ...scalarAttributes,
      ])
    )
    .insert((subQb: typeof trx) => {
      // SELECT columnName1, columnName2, columnName3, ...
      subQb
        .select(
          ...scalarAttributes.map((att: string) => {
            // Override 'publishedAt' and 'updatedAt' attributes
            if (att === 'published_at') {
              return trx.raw('NULL as ??', 'published_at');
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

/**
 * 2 pass migration to create the draft entries for all the published entries.
 * And then discard the drafts to copy the relations.
 */
const migrateUp = async (trx: Knex, db: Database) => {
  const dpModels = [];
  for (const meta of db.metadata.values()) {
    const hasDP = await hasDraftAndPublish(trx, meta);
    if (hasDP) {
      dpModels.push(meta);
    }
  }

  /**
   * Create plain draft entries for all the entries that were published.
   */
  for (const model of dpModels) {
    await copyPublishedEntriesToDraft({ db, trx, uid: model.uid });
  }

  /**
   * Discard the drafts will copy the relations from the published entries to the newly created drafts.
   *
   * Load a batch of entries (batched to prevent loading millions of rows at once ),
   * and discard them using the document service.
   */
  for (const model of dpModels) {
    const discardDraft = async (entry: DocumentVersion) =>
      strapi
        .documents(model.uid as UID.ContentType)
        .discardDraft({ documentId: entry.documentId, locale: entry.locale });

    for await (const batch of getBatchToDiscard({ db, trx, uid: model.uid })) {
      await async.map(batch, discardDraft, { concurrency: 10 });
    }
  }
};

export const discardDocumentDrafts: Migration = {
  name: 'core::5.0.0-discard-drafts',
  async up(trx, db) {
    await migrateUp(trx, db);
  },
  async down() {
    throw new Error('not implemented');
  },
};
