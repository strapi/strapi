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
 * 2. Copies relations from published entries to draft entries using direct database queries for efficiency.
 */

/* eslint-disable no-continue */
import type { UID } from '@strapi/types';
import type { Database, Migration } from '@strapi/database';
import { contentTypes } from '@strapi/utils';
import {
  getComponentJoinTableName,
  getComponentJoinColumnEntityName,
  getComponentJoinColumnInverseName,
  getComponentTypeColumn,
} from '../../utils/transform-content-types-to-models';

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
  if (!meta) {
    return;
  }

  // Create mapping from published entry ID to draft entry ID
  const publishedToDraftMap = await createPublishedToDraftMap(trx, uid, meta);

  if (!publishedToDraftMap || publishedToDraftMap.size === 0) {
    return;
  }

  // Copy relations for this content type
  await copyRelationsForContentType({
    trx,
    uid,
    publishedToDraftMap,
  });

  // Copy relations from other content types that target this content type
  await copyRelationsFromOtherContentTypes({
    trx,
    uid,
    publishedToDraftMap,
  });

  // Copy relations from this content type that target other content types (category 3)
  await copyRelationsToOtherContentTypes({
    trx,
    uid,
    publishedToDraftMap,
  });

  // Copy component relations from published entries to draft entries
  await copyComponentRelations({
    trx,
    uid,
    publishedToDraftMap,
  });
}

/**
 * Helper to batch process arrays in chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Helper to create publishedToDraftMap for a content type
 * This extracts the common logic used in copyRelationsToDrafts and updateJoinColumnRelations
 */
async function createPublishedToDraftMap(
  trx: Knex,
  uid: string,
  meta: any
): Promise<Map<number, number> | null> {
  // Get all published entries for this content type
  const publishedEntries = (await trx(meta.tableName)
    .select(['id', 'document_id', 'locale'])
    .whereNotNull('published_at')) as Array<{ id: number; document_id: string; locale: string }>;

  // Get all draft entries for this content type
  const draftEntries = (await trx(meta.tableName)
    .select(['id', 'document_id', 'locale'])
    .whereNull('published_at')) as Array<{ id: number; document_id: string; locale: string }>;

  if (publishedEntries.length === 0 || draftEntries.length === 0) {
    return null;
  }

  // Check if this is a localized content type (i18n)
  const i18nService = strapi.plugin('i18n')?.service('content-types');
  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes] as any;
  const isLocalized = i18nService?.isLocalizedContentType(contentType) ?? false;

  // Create mapping from document_id (and locale if i18n) to draft entry ID
  const draftByDocumentId = new Map<string, (typeof draftEntries)[0]>();
  for (const draft of draftEntries) {
    if (draft.document_id) {
      const key = isLocalized ? `${draft.document_id}:${draft.locale || ''}` : draft.document_id;
      draftByDocumentId.set(key, draft);
    }
  }

  // Create mapping from published entry ID to draft entry ID
  const publishedToDraftMap = new Map<number, number>();
  for (const published of publishedEntries) {
    if (!published.document_id) continue;

    const key = isLocalized
      ? `${published.document_id}:${published.locale || ''}`
      : published.document_id;

    const draft = draftByDocumentId.get(key);
    if (draft) {
      publishedToDraftMap.set(published.id, draft.id);
    }
  }

  return publishedToDraftMap.size > 0 ? publishedToDraftMap : null;
}

/**
 * Copy relations within the same content type (self-referential relations)
 */
async function copyRelationsForContentType({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
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

    // Skip component join tables - they are handled by copyComponentRelations
    if (joinTable.name.includes('_cmps')) {
      continue;
    }

    const { name: sourceColumnName } = joinTable.joinColumn;
    const { name: targetColumnName } = joinTable.inverseJoinColumn;

    // Process in batches to avoid MySQL query size limits
    const publishedIdsChunks = chunkArray(publishedIds, 1000);

    for (const publishedIdsChunk of publishedIdsChunks) {
      // Get relations where the source is a published entry (in batches)
      const relations = await trx(joinTable.name)
        .select('*')
        .whereIn(sourceColumnName, publishedIdsChunk);

      if (relations.length === 0) {
        continue;
      }

      // Create new relations pointing to draft entries
      // Remove the 'id' field to avoid duplicate key errors
      const newRelations = relations
        .map((relation) => {
          const newSourceId = publishedToDraftMap.get(relation[sourceColumnName]);
          const newTargetId = publishedToDraftMap.get(relation[targetColumnName]);

          if (!newSourceId || !newTargetId) {
            // Skip if no mapping found
            return null;
          }

          // Create new relation object without the 'id' field
          const { id, ...relationWithoutId } = relation;
          return {
            ...relationWithoutId,
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
}

/**
 * Copy relations from other content types that target this content type
 */
async function copyRelationsFromOtherContentTypes({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
}) {
  const targetIds = Array.from(publishedToDraftMap.keys());
  const targetMeta = strapi.db.metadata.get(uid);
  if (!targetMeta) return;

  // Get all draft entries for this content type (to check for existing old draft relations)
  const draftEntries = (await trx(targetMeta.tableName)
    .select(['id', 'document_id', 'locale'])
    .whereNull('published_at')) as Array<{ id: number; document_id: string; locale: string }>;

  // Create a set of draft IDs for quick lookup
  const draftIds = new Set(draftEntries.map((e) => e.id));

  // Iterate through all content types and components to find relations targeting our content type
  const contentTypes = Object.values(strapi.contentTypes) as any[];
  const components = Object.values(strapi.components) as any[];

  for (const model of [...contentTypes, ...components]) {
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

      // Skip component join tables - they are handled by copyComponentRelations
      if (joinTable.name.includes('_cmps')) {
        continue;
      }

      const { name: targetColumnName } = joinTable.inverseJoinColumn;
      const { name: sourceColumnName } = joinTable.joinColumn;

      // Process in batches to avoid MySQL query size limits
      const targetIdsChunks = chunkArray(targetIds, 1000);

      for (const targetIdsChunk of targetIdsChunks) {
        // Get relations where the target is a published entry of our content type (in batches)
        const relations = await trx(joinTable.name)
          .select('*')
          .whereIn(targetColumnName, targetIdsChunk);

        if (relations.length === 0) {
          continue;
        }

        // For content types without draft/publish, we need special handling:
        // Only create relations to new drafts if there isn't already a relation to an old draft with the same document_id
        if (!model.options?.draftAndPublish) {
          // Get all relations from this source model to any drafts (old or new)
          const allSourceIds = [...new Set(relations.map((r) => r[sourceColumnName]))];

          if (allSourceIds.length > 0) {
            // Get all relations from these sources to any drafts
            const allDraftRelations = await trx(joinTable.name)
              .select('*')
              .whereIn(sourceColumnName, allSourceIds)
              .whereIn(targetColumnName, Array.from(draftIds));

            // Get document_ids for all draft targets
            const draftTargetIds = [...new Set(allDraftRelations.map((r) => r[targetColumnName]))];
            const draftTargetEntries =
              draftTargetIds.length > 0
                ? ((await trx(targetMeta.tableName)
                    .select(['id', 'document_id', 'locale'])
                    .whereIn('id', draftTargetIds)) as Array<{
                    id: number;
                    document_id: string;
                    locale: string;
                  }>)
                : [];

            const draftIdToDocumentId = new Map<number, string>();
            for (const entry of draftTargetEntries) {
              draftIdToDocumentId.set(entry.id, entry.document_id || '');
            }

            // Create a map: sourceId -> Set of document_ids it already relates to (via old drafts)
            const sourceToDocumentIds = new Map<number, Set<string>>();
            for (const draftRelation of allDraftRelations) {
              const sourceId = draftRelation[sourceColumnName];
              const draftTargetId = draftRelation[targetColumnName];
              const documentId = draftIdToDocumentId.get(draftTargetId);
              if (documentId) {
                if (!sourceToDocumentIds.has(sourceId)) {
                  sourceToDocumentIds.set(sourceId, new Set());
                }
                sourceToDocumentIds.get(sourceId)!.add(documentId);
              }
            }

            // Get published entries for the current batch to get their document_ids
            const publishedTargetEntries = (await trx(targetMeta.tableName)
              .select(['id', 'document_id', 'locale'])
              .whereIn('id', targetIdsChunk)) as Array<{
              id: number;
              document_id: string;
              locale: string;
            }>;

            const publishedIdToDocumentId = new Map<number, string>();
            for (const entry of publishedTargetEntries) {
              publishedIdToDocumentId.set(entry.id, entry.document_id || '');
            }

            // Filter relations: only include those that don't already have a relation to an old draft with same document_id
            const relationsToProcess = relations.filter((relation) => {
              const sourceId = relation[sourceColumnName];
              const publishedTargetId = relation[targetColumnName];
              const publishedDocumentId = publishedIdToDocumentId.get(publishedTargetId);

              if (!publishedDocumentId) {
                return true; // Can't match, create new relation
              }

              const existingDocumentIds = sourceToDocumentIds.get(sourceId);
              if (!existingDocumentIds || existingDocumentIds.size === 0) {
                return true; // No old draft relation exists, create new one
              }

              // Check if source already relates to a draft with the same document_id
              const hasMatchingOldDraft = existingDocumentIds.has(publishedDocumentId);

              // Only create relation if there's no matching old draft
              return !hasMatchingOldDraft;
            });

            // Create new relations pointing to draft entries
            const newRelations = relationsToProcess
              .map((relation) => {
                const newTargetId = publishedToDraftMap.get(relation[targetColumnName]);

                if (!newTargetId) {
                  console.log(
                    `[copyRelationsFromOtherContentTypes] No draft mapping for target ${relation[targetColumnName]} (relation from ${relation[sourceColumnName]} to ${relation[targetColumnName]})`
                  );
                  return null;
                }

                // Create new relation object without the 'id' field
                const { id, ...relationWithoutId } = relation;
                return {
                  ...relationWithoutId,
                  [targetColumnName]: newTargetId,
                };
              })
              .filter(Boolean);

            if (newRelations.length > 0) {
              await trx.batchInsert(joinTable.name, newRelations, 1000);
            }
          } else {
            // No source IDs to check, process all relations normally
            const newRelations = relations
              .map((relation) => {
                const newTargetId = publishedToDraftMap.get(relation[targetColumnName]);

                if (!newTargetId) {
                  console.log(
                    `[copyRelationsFromOtherContentTypes] No draft mapping for target ${relation[targetColumnName]} (relation from ${relation[sourceColumnName]} to ${relation[targetColumnName]})`
                  );
                  return null;
                }

                // Create new relation object without the 'id' field
                const { id, ...relationWithoutId } = relation;
                return {
                  ...relationWithoutId,
                  [targetColumnName]: newTargetId,
                };
              })
              .filter(Boolean);

            if (newRelations.length > 0) {
              await trx.batchInsert(joinTable.name, newRelations, 1000);
            }
          }
        } else {
          // For content types with draft/publish, copy all relations (standard behavior)
          const newRelations = relations
            .map((relation) => {
              const newTargetId = publishedToDraftMap.get(relation[targetColumnName]);

              if (!newTargetId) {
                console.log(
                  `[copyRelationsFromOtherContentTypes] No draft mapping for target ${relation[targetColumnName]} (relation from ${relation[sourceColumnName]} to ${relation[targetColumnName]})`
                );
                return null;
              }

              // Create new relation object without the 'id' field
              const { id, ...relationWithoutId } = relation;
              return {
                ...relationWithoutId,
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
  }
}

/**
 * Helper to get publishedToDraftMap for a target content type
 */
async function getTargetPublishedToDraftMap(
  trx: Knex,
  targetUid: string
): Promise<Map<number, number> | null> {
  const targetMeta = strapi.db.metadata.get(targetUid);
  if (!targetMeta) return null;

  // Check if target has draft/publish enabled
  const targetModel = strapi.getModel(targetUid as UID.ContentType);
  const targetHasDP = contentTypes.hasDraftAndPublish(targetModel);
  if (!targetHasDP) {
    return null; // Target doesn't have draft/publish, no mapping needed
  }

  // Get all published and draft entries for target content type
  const targetPublishedEntries = (await trx(targetMeta.tableName)
    .select(['id', 'document_id', 'locale'])
    .whereNotNull('published_at')) as Array<{ id: number; document_id: string; locale: string }>;

  const targetDraftEntries = (await trx(targetMeta.tableName)
    .select(['id', 'document_id', 'locale'])
    .whereNull('published_at')) as Array<{ id: number; document_id: string; locale: string }>;

  // Check if target is localized
  const i18nService = strapi.plugin('i18n')?.service('content-types');
  const targetContentType = strapi.contentTypes[
    targetUid as keyof typeof strapi.contentTypes
  ] as any;
  const isTargetLocalized = i18nService?.isLocalizedContentType(targetContentType) ?? false;

  // Create mapping from document_id (and locale if i18n) to draft entry ID
  const targetDraftByDocumentId = new Map<string, (typeof targetDraftEntries)[0]>();
  for (const draft of targetDraftEntries) {
    if (draft.document_id) {
      const key = isTargetLocalized
        ? `${draft.document_id}:${draft.locale || ''}`
        : draft.document_id;
      targetDraftByDocumentId.set(key, draft);
    }
  }

  // Create mapping from published entry ID to draft entry ID
  const targetPublishedToDraftMap = new Map<number, number>();
  for (const published of targetPublishedEntries) {
    if (!published.document_id) continue;

    const key = isTargetLocalized
      ? `${published.document_id}:${published.locale || ''}`
      : published.document_id;

    const draft = targetDraftByDocumentId.get(key);
    if (draft) {
      targetPublishedToDraftMap.set(published.id, draft.id);
    }
  }

  return targetPublishedToDraftMap;
}

/**
 * Copy relations from this content type that target other content types (category 3)
 * Example: Article -> Categories/Tags
 */
async function copyRelationsToOtherContentTypes({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
}) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) return;

  const publishedIds = Array.from(publishedToDraftMap.keys());

  // Cache target publishedToDraftMap to avoid duplicate calls for same target
  const targetMapCache = new Map<string, Map<number, number> | null>();

  for (const attribute of Object.values(meta.attributes) as any) {
    if (attribute.type !== 'relation' || attribute.target === uid) {
      // Skip self-referential relations (handled by copyRelationsForContentType)
      continue;
    }

    const joinTable = attribute.joinTable;
    if (!joinTable) {
      continue;
    }

    // Skip component join tables - they are handled by copyComponentRelations
    if (joinTable.name.includes('_cmps')) {
      continue;
    }

    const { name: sourceColumnName } = joinTable.joinColumn;
    const { name: targetColumnName } = joinTable.inverseJoinColumn;

    // Get target content type's publishedToDraftMap if it has draft/publish (cached)
    const targetUid = attribute.target;
    if (!targetMapCache.has(targetUid)) {
      targetMapCache.set(targetUid, await getTargetPublishedToDraftMap(trx, targetUid));
    }
    const targetPublishedToDraftMap = targetMapCache.get(targetUid);

    // Process in batches to avoid MySQL query size limits
    const publishedIdsChunks = chunkArray(publishedIds, 1000);

    for (const publishedIdsChunk of publishedIdsChunks) {
      // Get relations where the source is a published entry of our content type (in batches)
      const relations = await trx(joinTable.name)
        .select('*')
        .whereIn(sourceColumnName, publishedIdsChunk);

      if (relations.length === 0) {
        continue;
      }

      // Create new relations pointing to draft entries
      // Remove the 'id' field to avoid duplicate key errors
      const newRelations = relations
        .map((relation) => {
          const newSourceId = publishedToDraftMap.get(relation[sourceColumnName]);

          if (!newSourceId) {
            return null;
          }

          // Map target ID to draft if target has draft/publish enabled
          // This matches discard() behavior: drafts relate to drafts
          let newTargetId = relation[targetColumnName];
          if (targetPublishedToDraftMap) {
            const mappedTargetId = targetPublishedToDraftMap.get(relation[targetColumnName]);
            if (mappedTargetId) {
              newTargetId = mappedTargetId;
            }
            // If no draft mapping, keep published target (target might not have DP or was deleted)
          }

          // Create new relation object without the 'id' field
          const { id, ...relationWithoutId } = relation;
          return {
            ...relationWithoutId,
            [sourceColumnName]: newSourceId,
            [targetColumnName]: newTargetId,
          };
        })
        .filter(Boolean);

      if (newRelations.length > 0) {
        try {
          await trx.batchInsert(joinTable.name, newRelations, 1000);
        } catch (error: any) {
          // If batch insert fails due to duplicates, try with conflict handling
          if (error.code === '23505' || error.message?.includes('duplicate key')) {
            const client = trx.client.config.client;
            if (client === 'postgres' || client === 'pg') {
              for (const relation of newRelations) {
                try {
                  await trx(joinTable.name).insert(relation).onConflict().ignore();
                } catch (err: any) {
                  if (err.code !== '23505' && !err.message?.includes('duplicate key')) {
                    throw err;
                  }
                }
              }
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
    }
  }
}

/**
 * Update JoinColumn relations (oneToOne, manyToOne foreign keys) to point to draft versions
 * This matches discard() behavior: when creating drafts, foreign keys should point to draft targets
 */
async function updateJoinColumnRelations({
  db,
  trx,
  uid,
}: {
  db: Database;
  trx: Knex;
  uid: string;
}) {
  const meta = db.metadata.get(uid);
  if (!meta) {
    return;
  }

  // Create mapping from published entry ID to draft entry ID
  const publishedToDraftMap = await createPublishedToDraftMap(trx, uid, meta);

  if (!publishedToDraftMap || publishedToDraftMap.size === 0) {
    return;
  }

  // Cache target publishedToDraftMap to avoid duplicate calls for same target
  const targetMapCache = new Map<string, Map<number, number> | null>();

  // Find all JoinColumn relations (oneToOne, manyToOne without joinTable)
  for (const attribute of Object.values(meta.attributes) as any) {
    if (attribute.type !== 'relation') {
      continue;
    }

    // Skip relations with joinTable (handled by copyRelationsToOtherContentTypes)
    if (attribute.joinTable) {
      continue;
    }

    // Only handle oneToOne and manyToOne relations that use joinColumn
    const joinColumn = attribute.joinColumn;
    if (!joinColumn) {
      continue;
    }

    const targetUid = attribute.target;
    const foreignKeyColumn = joinColumn.name;

    // Get target content type's publishedToDraftMap if it has draft/publish (cached)
    if (!targetMapCache.has(targetUid)) {
      targetMapCache.set(targetUid, await getTargetPublishedToDraftMap(trx, targetUid));
    }
    const targetPublishedToDraftMap = targetMapCache.get(targetUid);

    if (!targetPublishedToDraftMap) {
      // Target doesn't have draft/publish, foreign keys are fine as-is
      continue;
    }

    const draftIds = Array.from(publishedToDraftMap.values());
    const draftIdsChunks = chunkArray(draftIds, 1000);

    for (const draftIdsChunk of draftIdsChunks) {
      // Get draft entries with their foreign key values
      const draftEntriesWithFk = await trx(meta.tableName)
        .select(['id', foreignKeyColumn])
        .whereIn('id', draftIdsChunk)
        .whereNotNull(foreignKeyColumn);

      for (const draftEntry of draftEntriesWithFk) {
        const publishedTargetId = draftEntry[foreignKeyColumn];
        const draftTargetId = targetPublishedToDraftMap.get(publishedTargetId);

        if (draftTargetId && draftTargetId !== publishedTargetId) {
          // Update foreign key to point to draft target
          await trx(meta.tableName)
            .where('id', draftEntry.id)
            .update({ [foreignKeyColumn]: draftTargetId });
        }
      }
    }
  }
}

/**
 * Copy component relations from published entries to draft entries
 */
async function copyComponentRelations({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
}) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) {
    return;
  }

  // Get collectionName from content type schema (Meta only has tableName which may be shortened)
  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes] as any;
  const collectionName = contentType?.collectionName;
  if (!collectionName) {
    return;
  }

  const identifiers = strapi.db.metadata.identifiers;
  const joinTableName = getComponentJoinTableName(collectionName, identifiers);
  const entityIdColumn = getComponentJoinColumnEntityName(identifiers);
  const componentIdColumn = getComponentJoinColumnInverseName(identifiers);
  const componentTypeColumn = getComponentTypeColumn(identifiers);
  const fieldColumn = identifiers.FIELD_COLUMN;
  const orderColumn = identifiers.ORDER_COLUMN;

  // Check if component join table exists
  const hasTable = await trx.schema.hasTable(joinTableName);
  if (!hasTable) {
    return;
  }

  const publishedIds = Array.from(publishedToDraftMap.keys());

  // Process in batches to avoid MySQL query size limits
  const publishedIdsChunks = chunkArray(publishedIds, 1000);

  for (const publishedIdsChunk of publishedIdsChunks) {
    // Get component relations for published entries
    const componentRelations = await trx(joinTableName)
      .select('*')
      .whereIn(entityIdColumn, publishedIdsChunk);

    if (componentRelations.length === 0) {
      continue;
    }

    // Filter component relations: only propagate if component's parent in the component hierarchy doesn't have draft/publish
    // This matches discardDraft() behavior via shouldPropagateComponentRelationToNewVersion
    //
    // The logic: find what contains this component instance (could be a content type or another component).
    // If it's a component, recursively check its parents. If any parent in the chain has DP, filter out the relation.
    const filteredComponentRelations = await Promise.all(
      componentRelations.map(async (relation) => {
        const componentId = relation[componentIdColumn];
        const componentType = relation[componentTypeColumn];
        const entityId = relation[entityIdColumn]; // The entity that contains this component

        // Get component schema
        const componentSchema = strapi.components[
          componentType as keyof typeof strapi.components
        ] as any;
        if (!componentSchema) {
          // Unknown component, keep relation
          console.log(
            `[copyComponentRelations] ${uid}: Keeping relation - unknown component type ${componentType} (entity: ${entityId}, componentId: ${componentId})`
          );
          return relation;
        }

        // Find parent schemas for this component (what content types/components can contain this component)
        // Exclude the current content type - we're processing it, so components directly on it should be kept
        const parentSchemas = [
          ...Object.values(strapi.contentTypes),
          ...Object.values(strapi.components),
        ].filter((schema: any) => {
          // Exclude the current content type - components directly on it should be copied
          if (schema.uid === uid) return false;
          if (!schema?.attributes) return false;
          return Object.values(schema.attributes).some((attr: any) => {
            return (
              (attr.type === 'component' && attr.component === componentSchema.uid) ||
              (attr.type === 'dynamiczone' && attr.components?.includes(componentSchema.uid))
            );
          });
        });

        // Find the actual parent for this component instance in component hierarchy
        // This finds what component (not the current content type) contains this component instance
        // If component is directly on the current content type (not nested), this will be null
        let componentParent: { uid: string; table: string; parentId: number | string } | null =
          null;

        for (const parentSchema of parentSchemas) {
          if (!parentSchema.collectionName) continue;

          const parentJoinTableName = getComponentJoinTableName(
            parentSchema.collectionName,
            identifiers
          );
          const parentEntityIdColumn = getComponentJoinColumnEntityName(identifiers);
          const parentComponentIdColumn = getComponentJoinColumnInverseName(identifiers);
          const parentComponentTypeColumn = getComponentTypeColumn(identifiers);

          try {
            const hasTable = await trx.schema.hasTable(parentJoinTableName);
            if (!hasTable) continue;

            const parentRow = await trx(parentJoinTableName)
              .where({
                [parentComponentIdColumn]: componentId,
                [parentComponentTypeColumn]: componentSchema.uid,
              })
              .first(parentEntityIdColumn);

            if (parentRow) {
              componentParent = {
                uid: parentSchema.uid,
                table: parentSchema.collectionName,
                parentId: parentRow[parentEntityIdColumn],
              };
              break;
            }
          } catch {
            continue;
          }
        }

        // If component has no parent in component hierarchy (it's directly on the current content type), keep relation
        if (!componentParent) {
          console.log(
            `[copyComponentRelations] ${uid}: Keeping relation - component ${componentType} (id: ${componentId}) is directly on entity ${entityId} (no nested parent found)`
          );
          return relation;
        }

        console.log(
          `[copyComponentRelations] ${uid}: Component ${componentType} (id: ${componentId}, entity: ${entityId}) has parent in hierarchy: ${componentParent.uid} (parentId: ${componentParent.parentId})`
        );

        // Component is nested - check if its parent in the component hierarchy has DP
        // Recursively check if any parent in the component hierarchy has draft/publish
        const checkComponentParentHasDP = async (
          componentSchema: any,
          componentId: number | string
        ): Promise<boolean> => {
          const parentSchemasForComponent = [
            ...Object.values(strapi.contentTypes),
            ...Object.values(strapi.components),
          ].filter((schema: any) => {
            if (!schema?.attributes) return false;
            return Object.values(schema.attributes).some((attr: any) => {
              return (
                (attr.type === 'component' && attr.component === componentSchema.uid) ||
                (attr.type === 'dynamiczone' && attr.components?.includes(componentSchema.uid))
              );
            });
          });

          for (const parentSchema of parentSchemasForComponent) {
            if (!parentSchema.collectionName) continue;

            const parentJoinTableName = getComponentJoinTableName(
              parentSchema.collectionName,
              identifiers
            );
            try {
              const hasTable = await trx.schema.hasTable(parentJoinTableName);
              if (!hasTable) continue;

              const parentEntityIdColumn = getComponentJoinColumnEntityName(identifiers);
              const parentComponentIdColumn = getComponentJoinColumnInverseName(identifiers);
              const parentComponentTypeColumn = getComponentTypeColumn(identifiers);

              const parentRow = await trx(parentJoinTableName)
                .where({
                  [parentComponentIdColumn]: componentId,
                  [parentComponentTypeColumn]: componentSchema.uid,
                })
                .first(parentEntityIdColumn);

              if (parentRow) {
                // Check if parent is a content type with DP
                const parentContentType = strapi.contentTypes[
                  parentSchema.uid as keyof typeof strapi.contentTypes
                ] as any;
                if (parentContentType?.options?.draftAndPublish) {
                  return true; // Found DP parent
                }

                // If parent is a component, recurse
                if (strapi.components[parentSchema.uid as keyof typeof strapi.components]) {
                  const parentComponentSchema = strapi.components[
                    parentSchema.uid as keyof typeof strapi.components
                  ] as any;
                  const hasDP = await checkComponentParentHasDP(
                    parentComponentSchema,
                    parentRow[parentEntityIdColumn]
                  );
                  if (hasDP) {
                    return true;
                  }
                }
              }
            } catch {
              continue;
            }
          }

          return false; // No DP parent found
        };

        // Check if component's parent has DP
        if (strapi.components[componentParent.uid as keyof typeof strapi.components]) {
          // Parent is a component, recursively check its parents
          const parentComponentSchema = strapi.components[
            componentParent.uid as keyof typeof strapi.components
          ] as any;
          const hasDPParent = await checkComponentParentHasDP(
            parentComponentSchema,
            componentParent.parentId
          );
          if (hasDPParent) {
            // Component's parent in hierarchy has DP, filter out relation
            console.log(
              `[copyComponentRelations] Filtering: component ${componentType} (id: ${componentId}, entity: ${entityId}) has DP parent in hierarchy (${componentParent.uid})`
            );
            return null;
          }
        } else {
          // Parent is a content type (not the one we're processing), check if it has DP
          const parentContentType = strapi.contentTypes[
            componentParent.uid as keyof typeof strapi.contentTypes
          ] as any;
          if (parentContentType?.options?.draftAndPublish) {
            // Parent content type has DP, filter out relation
            console.log(
              `[copyComponentRelations] Filtering: component ${componentType} (id: ${componentId}, entity: ${entityId}) has DP parent content type (${componentParent.uid})`
            );
            return null;
          }
        }

        // No DP parent found, keep relation
        console.log(
          `[copyComponentRelations] ${uid}: Keeping relation - component ${componentType} (id: ${componentId}, entity: ${entityId}) has no DP parent in hierarchy`
        );
        return relation;
      })
    );

    // Filter out null values (filtered relations)
    const relationsToProcess = filteredComponentRelations.filter(Boolean) as Array<
      Record<string, any>
    >;

    const filteredCount = componentRelations.length - relationsToProcess.length;
    if (filteredCount > 0) {
      console.log(
        `[copyComponentRelations] ${uid}: Filtered ${filteredCount} of ${componentRelations.length} component relations (removed ${filteredCount} with DP parents)`
      );
    }

    // Create new component relations for draft entries
    // Remove the 'id' field to avoid duplicate key errors
    const mappedRelations = relationsToProcess
      .map((relation) => {
        const newEntityId = publishedToDraftMap.get(relation[entityIdColumn]);

        if (!newEntityId) {
          return null;
        }

        // Create new component relation object without the 'id' field
        const { id, ...relationWithoutId } = relation;
        return {
          ...relationWithoutId,
          [entityIdColumn]: newEntityId,
        };
      })
      .filter(Boolean) as Array<Record<string, any>>;

    // Deduplicate relations based on the unique constraint columns
    // This prevents duplicates within the same batch that could cause conflicts
    const uniqueKeyMap = new Map<string, Record<string, any>>();
    for (const relation of mappedRelations) {
      const uniqueKey = `${relation[entityIdColumn]}_${relation[componentIdColumn]}_${relation[fieldColumn]}_${relation[componentTypeColumn]}`;
      if (!uniqueKeyMap.has(uniqueKey)) {
        uniqueKeyMap.set(uniqueKey, relation);
      }
    }
    const deduplicatedRelations = Array.from(uniqueKeyMap.values());

    if (deduplicatedRelations.length === 0) {
      continue;
    }

    // Check which relations already exist in the database to avoid conflicts
    // We need to check all unique constraint columns (entity_id, cmp_id, field, component_type)
    const existingRelations = await trx(joinTableName)
      .select([entityIdColumn, componentIdColumn, fieldColumn, componentTypeColumn])
      .where((qb) => {
        // Build OR conditions for each relation we want to check
        for (const relation of deduplicatedRelations) {
          qb.orWhere((subQb) => {
            subQb
              .where(entityIdColumn, relation[entityIdColumn])
              .where(componentIdColumn, relation[componentIdColumn])
              .where(fieldColumn, relation[fieldColumn])
              .where(componentTypeColumn, relation[componentTypeColumn]);
          });
        }
      });

    // Create a set of existing relation keys for fast lookup
    const existingKeys = new Set<string>();
    for (const existing of existingRelations) {
      const key = `${existing[entityIdColumn]}_${existing[componentIdColumn]}_${existing[fieldColumn]}_${existing[componentTypeColumn]}`;
      existingKeys.add(key);
    }

    // Filter out relations that already exist
    const newComponentRelations = deduplicatedRelations.filter((relation) => {
      const key = `${relation[entityIdColumn]}_${relation[componentIdColumn]}_${relation[fieldColumn]}_${relation[componentTypeColumn]}`;
      return !existingKeys.has(key);
    });

    if (newComponentRelations.length > 0) {
      // Insert component relations, ignoring duplicates
      // Use INSERT ... ON CONFLICT DO NOTHING (PostgreSQL) or INSERT IGNORE (MySQL)
      const client = trx.client.config.client;

      if (client === 'postgres' || client === 'pg') {
        // PostgreSQL: Insert one at a time with ON CONFLICT DO NOTHING
        // Use raw SQL for more reliable conflict handling
        let insertedCount = 0;
        let skippedCount = 0;
        for (const relation of newComponentRelations) {
          try {
            // Use raw SQL - ?? is for identifiers, ? is for values in Knex
            const orderValue = relation[orderColumn] ?? null;

            await trx.raw(
              `INSERT INTO ?? (??, ??, ??, ??, ??) VALUES (?, ?, ?, ?, ?) 
               ON CONFLICT (??, ??, ??, ??) DO NOTHING`,
              [
                joinTableName,
                entityIdColumn,
                componentIdColumn,
                fieldColumn,
                componentTypeColumn,
                orderColumn,
                relation[entityIdColumn],
                relation[componentIdColumn],
                relation[fieldColumn],
                relation[componentTypeColumn],
                orderValue,
                entityIdColumn,
                componentIdColumn,
                fieldColumn,
                componentTypeColumn,
              ]
            );
            insertedCount += 1;
          } catch (error: any) {
            // Ignore duplicate key errors (PostgreSQL error code 23505)
            // This can happen if the record already exists in the database
            if (error.code !== '23505' && !error.message?.includes('duplicate key')) {
              throw error;
            } else {
              skippedCount += 1;
            }
          }
        }
        if (insertedCount > 0 || skippedCount > 0) {
          console.log(
            `[copyComponentRelations] ${uid}: Inserted ${insertedCount} component relations, skipped ${skippedCount} duplicates`
          );
        }
      } else if (client === 'mysql' || client === 'mysql2') {
        // MySQL: Use INSERT IGNORE
        try {
          await trx(joinTableName).insert(newComponentRelations).onConflict().ignore();
        } catch (error: any) {
          // If batch insert with onConflict fails, try one at a time
          for (const relation of newComponentRelations) {
            try {
              await trx(joinTableName).insert(relation).onConflict().ignore();
            } catch (err: any) {
              // Ignore duplicate key errors (MySQL error code ER_DUP_ENTRY)
              if (err.code !== 'ER_DUP_ENTRY' && err.code !== '23505') {
                throw err;
              }
            }
          }
        }
      } else {
        // SQLite: Try to insert and ignore errors
        for (const relation of newComponentRelations) {
          try {
            await trx(joinTableName).insert(relation);
          } catch (error: any) {
            // Ignore duplicate key errors
            if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE' && error.code !== '23505') {
              throw error;
            }
          }
        }
      }
    }
  }
}

/**
 * 2 pass migration to create the draft entries for all the published entries.
 * And then copy relations directly using database queries.
 */
const migrateUp = async (trx: Knex, db: Database) => {
  console.log('[migrateUp] Starting discard-drafts migration');
  const dpModels = [];
  for (const meta of db.metadata.values()) {
    const hasDP = await hasDraftAndPublish(trx, meta);
    if (hasDP) {
      dpModels.push(meta);
    }
  }

  console.log(`[migrateUp] Found ${dpModels.length} models with draft/publish`);

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

  /**
   * Update JoinColumn relations (foreign keys) to point to draft versions
   * This matches discard() behavior: drafts relate to drafts
   */
  for (const model of dpModels) {
    await updateJoinColumnRelations({ db, trx, uid: model.uid });
  }

  console.log('[migrateUp] Migration completed');
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
