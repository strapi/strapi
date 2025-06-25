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
import { createDocumentService } from '../../services/document-service';

type DocumentVersion = { documentId: string; locale: string };
type Knex = Parameters<Migration['up']>[0];

const migrationScriptId = 'core::5.0.0-discard-drafts'

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

/**
 * 2 pass migration to create the draft entries for all the published entries.
 * And then discard the drafts to copy the relations.
 */
const migrateUp = async (trx: Knex, db: Database) => {
  db.logger.info(`${migrationScriptId} running. This will discard all the drafts for published entries.`);
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
   *
   * NOTE: This is using a custom document service without any validations,
   *       to prevent the migration from failing if users already had invalid data in V4.
   *       E.g. @see https://github.com/strapi/strapi/issues/21583
   */
  const documentService = createDocumentService(strapi, {
    async validateEntityCreation(_, data) {
      return data;
    },
    async validateEntityUpdate(_, data) {
      // Data can be partially empty on partial updates
      // This migration doesn't trigger any update (or partial update),
      // so it's safe to return the data as is.
      return data as any;
    },
  });

  for (const model of dpModels) {
    db.logger.info(`${migrationScriptId} - Processing model: ${model.uid}`);
    
    const discardDraft = async (entry: DocumentVersion) => {
      try {
        db.logger.debug(`${migrationScriptId} - Discarding draft for documentId: ${entry.documentId}, locale: ${entry.locale}`);
        const result = await documentService(model.uid as UID.ContentType).discardDraft({
          documentId: entry.documentId,
          locale: entry.locale,
        });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        db.logger.error(`${migrationScriptId} - Error discarding draft for documentId: ${entry.documentId}, locale: ${entry.locale}: ${err.message}`);
        throw error; // Re-throw to handle at batch level
      }
    };

    let batchCount = 0;
    let totalProcessed = 0;
    
    // Process batches sequentially to avoid deadlocks with self-references
    for await (const batch of getBatchToDiscard({ db, trx, uid: model.uid })) {
      batchCount++;
      const batchSize = batch.length;
      db.logger.info(`${migrationScriptId} - Processing batch #${batchCount} with ${batchSize} entries for model: ${model.uid}`);
      
      // Group documents by their document ID to process related documents together
      const documentGroups = batch.reduce((groups, entry) => {
        const key = entry.documentId;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(entry);
        return groups;
      }, {} as Record<string, DocumentVersion[]>);

      const groupCount = Object.keys(documentGroups).length;
      db.logger.info(`${migrationScriptId} - Batch #${batchCount} contains ${groupCount} unique document groups`);
      
      let currentGroup = 0;
      
      // Process document groups sequentially to avoid deadlocks
      for (const documentId of Object.keys(documentGroups)) {
        currentGroup++;
        const entries = documentGroups[documentId];
        
        db.logger.info(`${migrationScriptId} - Processing group ${currentGroup}/${groupCount}, documentId: ${documentId} with ${entries.length} locales`);
        
        try {
          // Process entries within the same document ID in parallel (safe because they're different locales)
          await async.map(entries, discardDraft, { concurrency: 5 });
          totalProcessed += entries.length;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          db.logger.error(`${migrationScriptId} - Failed to process document group for documentId: ${documentId}: ${err.message}`);
          // Continue with next group despite errors
        }
        
        if (currentGroup % 10 === 0 || currentGroup === groupCount) {
          db.logger.info(`${migrationScriptId} - Progress: ${currentGroup}/${groupCount} groups processed in current batch`);
        }
      }
      
      db.logger.info(`${migrationScriptId} - Completed batch #${batchCount}, total entries processed so far: ${totalProcessed}`);
    }
  }
  db.logger.info(`${migrationScriptId} is complete and has discarded all the drafts for published entries.`);
};

export const discardDocumentDrafts: Migration = {
  name: migrationScriptId,
  async up(trx, db) {
    await migrateUp(trx, db);
  },
  async down() {
    throw new Error('not implemented');
  },
};
