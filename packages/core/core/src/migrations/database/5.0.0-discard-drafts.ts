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
import { contentTypes } from '@strapi/utils';

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
 * Copy relations from published entries to draft entries using direct database queries.
 * This replaces the need to call discardDraft for each entry.
 */
async function copyRelationsToDrafts({ db, trx, uid }: { db: Database; trx: Knex; uid: string }) {
  const meta = db.metadata.get(uid);
  if (!meta) return;

  // Get all published and draft entries for this content type
  const publishedEntries = await trx(meta.tableName)
    .select(['id', 'documentId', 'locale'])
    .whereNotNull('published_at');

  const draftEntries = await trx(meta.tableName)
    .select(['id', 'documentId', 'locale'])
    .whereNull('published_at');

  if (publishedEntries.length === 0 || draftEntries.length === 0) {
    return;
  }

  // Create mapping from documentId to draft entry ID
  const draftByDocumentId = new Map();
  for (const draft of draftEntries) {
    draftByDocumentId.set(draft.documentId, draft);
  }

  // Create mapping from published entry ID to draft entry ID
  const publishedToDraftMap = new Map();
  for (const published of publishedEntries) {
    const draft = draftByDocumentId.get(published.documentId);
    if (draft) {
      publishedToDraftMap.set(published.id, draft.id);
    }
  }

  if (publishedToDraftMap.size === 0) {
    return;
  }

  // Copy relations for this content type
  await copyRelationsForContentType({
    trx,
    uid,
    publishedToDraftMap,
    publishedEntries,
  });

  // Copy relations from other content types that target this content type
  await copyRelationsFromOtherContentTypes({
    trx,
    uid,
    publishedToDraftMap,
    publishedEntries,
  });
}

/**
 * Copy relations within the same content type (self-referential relations)
 */
async function copyRelationsForContentType({
  trx,
  uid,
  publishedToDraftMap,
  publishedEntries,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
  publishedEntries: Array<{ id: number; documentId: string; locale: string }>;
}) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) return;

  const publishedIds = Array.from(publishedToDraftMap.keys());

  for (const attribute of Object.values(meta.attributes) as any) {
    if (attribute.type !== 'relation' || attribute.target !== uid) {
      continue;
    }

    const joinTable = attribute.joinTable;
    if (!joinTable) {
      continue;
    }

    const { name: sourceColumnName } = joinTable.joinColumn;
    const { name: targetColumnName } = joinTable.inverseJoinColumn;
    const orderColumnName = joinTable.orderColumnName;

    // Get all relations where the source is a published entry
    const relations = await trx(joinTable.name).select('*').whereIn(sourceColumnName, publishedIds);

    if (relations.length === 0) {
      continue;
    }

    // Create new relations pointing to draft entries
    const newRelations = relations
      .map((relation) => {
        const newSourceId = publishedToDraftMap.get(relation[sourceColumnName]);
        const newTargetId = publishedToDraftMap.get(relation[targetColumnName]);

        if (!newSourceId || !newTargetId) {
          return null;
        }

        return {
          ...relation,
          [sourceColumnName]: newSourceId,
          [targetColumnName]: newTargetId,
        };
      })
      .filter(Boolean);

    if (newRelations.length > 0) {
      await trx.batchInsert(joinTable.name, newRelations, 1000);
    }
  }
}

/**
 * Copy relations from other content types that target this content type
 */
async function copyRelationsFromOtherContentTypes({
  trx,
  uid,
  publishedToDraftMap,
  publishedEntries,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
  publishedEntries: Array<{ id: number; documentId: string; locale: string }>;
}) {
  const targetIds = Array.from(publishedToDraftMap.keys());

  // Iterate through all content types to find relations targeting our content type
  for (const model of Object.values(strapi.contentTypes) as any) {
    const dbModel = strapi.db.metadata.get(model.uid);
    if (!dbModel) continue;

    for (const attribute of Object.values(dbModel.attributes) as any) {
      if (attribute.type !== 'relation' || attribute.target !== uid) {
        continue;
      }

      const joinTable = attribute.joinTable;
      if (!joinTable) {
        continue;
      }

      const { name: sourceColumnName } = joinTable.joinColumn;
      const { name: targetColumnName } = joinTable.inverseJoinColumn;
      const orderColumnName = joinTable.orderColumnName;

      // Get all relations where the target is a published entry of our content type
      const relations = await trx(joinTable.name).select('*').whereIn(targetColumnName, targetIds);

      if (relations.length === 0) {
        continue;
      }

      // Create new relations pointing to draft entries
      const newRelations = relations
        .map((relation) => {
          const newTargetId = publishedToDraftMap.get(relation[targetColumnName]);

          if (!newTargetId) {
            return null;
          }

          return {
            ...relation,
            [targetColumnName]: newTargetId,
          };
        })
        .filter(Boolean);

      if (newRelations.length > 0) {
        await trx.batchInsert(joinTable.name, newRelations, 1000);
      }
    }
  }
}

/**
 * 2 pass migration to create the draft entries for all the published entries.
 * And then copy relations directly using database queries.
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
   * Copy relations from published entries to draft entries using direct database queries.
   * This is much more efficient than calling discardDraft for each entry.
   */
  for (const model of dpModels) {
    await copyRelationsToDrafts({ db, trx, uid: model.uid });
  }
};

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
  defaultBatchSize = 1000,
}: {
  db: Database;
  trx: Knex;
  uid: string;
  defaultBatchSize?: number;
}) {
  const client = db.config.connection.client;
  const isSQLite =
    typeof client === 'string' && ['sqlite', 'sqlite3', 'better-sqlite3'].includes(client);

  // The SQLite documentation states that the maximum number of terms in a
  // compound SELECT statement is 500 by default.
  // See: https://www.sqlite.org/limits.html
  // To ensure a successful migration, we limit the batch size to 500 for SQLite.
  const batchSize = isSQLite ? Math.min(defaultBatchSize, 500) : defaultBatchSize;
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

export const discardDocumentDrafts: Migration = {
  name: 'core::5.0.0-discard-drafts',
  async up(trx, db) {
    await migrateUp(trx, db);
  },
  async down() {
    throw new Error('not implemented');
  },
};
