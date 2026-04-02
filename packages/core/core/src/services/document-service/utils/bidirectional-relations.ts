/* eslint-disable no-continue */
import { keyBy, omit } from 'lodash/fp';
import type { UID, Schema } from '@strapi/types';
import type { JoinTable } from '@strapi/database';

interface LoadContext {
  oldVersions: { id: string; locale: string }[];
  newVersions: { id: string; locale: string }[];
}

interface RelationEntry {
  joinTable: JoinTable;
  relations: Record<string, unknown>[];
}

/**
 * Loads all bidirectional relations that need to be synchronized when content entries change state
 * (e.g., during publish/unpublish operations).
 *
 * In Strapi, bidirectional relations allow maintaining order from both sides of the relation.
 * When an entry is published, the following occurs:
 *
 * 1. The old published entry is deleted
 * 2. A new entry is created with all its relations
 *
 * This process affects relation ordering in the following way:
 *
 * Initial state (Entry A related to X, Y, Z):
 * ```
 *   Entry A (draft)     Entry A (published)
 *      │                     │
 *      ├──(1)→ X            ├──(1)→ X
 *      ├──(2)→ Y            ├──(2)→ Y
 *      └──(3)→ Z            └──(3)→ Z
 *
 *   X's perspective:         Y's perspective:         Z's perspective:
 *      └──(2)→ Entry A         └──(1)→ Entry A         └──(3)→ Entry A
 * ```
 *
 * After publishing Entry A (without relation order sync):
 * ```
 *   Entry A (draft)     Entry A (new published)
 *      │                     │
 *      ├──(1)→ X            ├──(1)→ X
 *      ├──(2)→ Y            ├──(2)→ Y
 *      └──(3)→ Z            └──(3)→ Z
 *
 *   X's perspective:         Y's perspective:         Z's perspective:
 *      └──(3)→ Entry A         └──(3)→ Entry A         └──(3)→ Entry A
 *                           (all relations appear last in order)
 * ```
 *
 * This module preserves the original ordering from both perspectives by:
 * 1. Capturing the relation order before the entry state changes
 * 2. Restoring this order after the new relations are created
 *
 * @param uid - The unique identifier of the content type being processed
 * @param context - Object containing arrays of old and new entry versions
 * @returns Array of objects containing join table metadata and relations to be updated
 */
const load = async (uid: UID.ContentType, { oldVersions }: LoadContext) => {
  const relationsToUpdate: RelationEntry[] = [];

  await strapi.db.transaction(async ({ trx }) => {
    const contentTypes = Object.values(strapi.contentTypes) as Schema.ContentType[];
    const components = Object.values(strapi.components) as Schema.Component[];

    for (const model of [...contentTypes, ...components]) {
      const dbModel = strapi.db.metadata.get(model.uid);

      for (const attribute of Object.values(dbModel.attributes) as Record<string, any>[]) {
        // Skip if not a bidirectional relation targeting our content type
        if (
          attribute.type !== 'relation' ||
          attribute.target !== uid ||
          !(attribute.inversedBy || attribute.mappedBy)
        ) {
          continue;
        }

        // If it's a self referencing relation, there is no need to sync any relation
        // The order will already be handled as both sides are inside the same content type
        if (model.uid === uid) {
          continue;
        }

        const joinTable = attribute.joinTable;
        if (!joinTable) {
          continue;
        }

        const { name: targetColumnName } = joinTable.inverseJoinColumn;

        // Load all relations that need their order preserved
        const oldEntryIds = oldVersions.map((entry) => entry.id);

        const existingRelations = await strapi.db
          .getConnection()
          .select('*')
          .from(joinTable.name)
          .whereIn(targetColumnName, oldEntryIds)
          .transacting(trx);

        if (existingRelations.length > 0) {
          relationsToUpdate.push({ joinTable, relations: existingRelations });
        }
      }
    }
  });

  return relationsToUpdate;
};

/**
 * Synchronizes the order of bidirectional relations after content entries have changed state.
 *
 * When entries change state (e.g., draft → published), their IDs change and all relations are recreated.
 * While the order of relations from the entry's perspective is maintained (as they're created in order),
 * the inverse relations (from related entries' perspective) would all appear last in order since they're new.
 *
 * Example:
 * ```
 * Before publish:
 *   Article(id:1) →(order:1)→ Category(id:5)
 *   Category(id:5) →(order:3)→ Article(id:1)
 *
 * After publish (without sync):
 *   Article(id:2) →(order:1)→ Category(id:5)    [order preserved]
 *   Category(id:5) →(order:99)→ Article(id:2)   [order lost - appears last]
 *
 * After sync:
 *   Article(id:2) →(order:1)→ Category(id:5)    [order preserved]
 *   Category(id:5) →(order:3)→ Article(id:2)    [order restored]
 * ```
 *
 * @param oldEntries - Array of previous entry versions with their IDs and locales
 * @param newEntries - Array of new entry versions with their IDs and locales
 * @param existingRelations - Array of join table data containing the relations to be updated
 */
const sync = async (
  oldEntries: { id: string; locale: string }[],
  newEntries: { id: string; locale: string }[],
  existingRelations: RelationEntry[]
) => {
  // Group new entries by locale for easier lookup
  const newEntriesByLocale = keyBy('locale', newEntries);

  // Create a mapping of old entry IDs to new entry IDs based on locale
  const entryIdMapping = oldEntries.reduce(
    (acc, oldEntry) => {
      const newEntry = newEntriesByLocale[oldEntry.locale];
      if (!newEntry) return acc;
      acc[oldEntry.id] = newEntry.id;
      return acc;
    },
    {} as Record<string, string>
  );

  const republishedEntryIds = new Set(newEntries.map((e) => String(e.id)));
  const isRepublishedEntry = (id: string | number) => republishedEntryIds.has(String(id));

  await strapi.db.transaction(async ({ trx }) => {
    for (const { joinTable, relations } of existingRelations) {
      const sourceColumn = joinTable.inverseJoinColumn.name;
      const targetColumn = joinTable.joinColumn.name;
      const orderColumn = joinTable.orderColumnName;

      // Failsafe in case those don't exist
      if (!sourceColumn || !targetColumn || !orderColumn) {
        continue;
      }

      const mappedRelations = relations
        .map((relation) => ({
          relation,
          oldSourceId: relation[sourceColumn] as string,
          targetId: relation[targetColumn] as string,
          originalOrder: relation[orderColumn],
          newSourceId: entryIdMapping[relation[sourceColumn] as string],
        }))
        .filter((r): r is typeof r & { newSourceId: string } => Boolean(r.newSourceId));

      if (!mappedRelations.length) continue;

      const newSourceIds = mappedRelations.map((r) => r.newSourceId);

      // Batch UPDATE: set each row's order in a single statement using CASE
      const caseFragments = mappedRelations.map(() => `WHEN ?? = ? AND ?? = ? THEN ?`);
      const caseBindings = mappedRelations.flatMap(({ newSourceId, targetId, originalOrder }) => [
        sourceColumn,
        newSourceId,
        targetColumn,
        targetId,
        originalOrder,
      ]);

      await trx(joinTable.name)
        .whereIn(sourceColumn, newSourceIds)
        .update({
          [orderColumn]: trx.raw(`CASE ${caseFragments.join(' ')} ELSE ?? END`, [
            ...caseBindings,
            orderColumn,
          ]),
        });

      // Batch SELECT: find which rows exist so we know what to insert
      const existingRows = await trx(joinTable.name)
        .whereIn(sourceColumn, newSourceIds)
        .select(sourceColumn, targetColumn);

      const existingSet = new Set(
        existingRows.map((r: Record<string, unknown>) => `${r[sourceColumn]}:${r[targetColumn]}`)
      );

      // Batch INSERT: insert cascade-deleted rows that aren't from republished sources
      const toInsert = mappedRelations
        .filter(
          ({ newSourceId, targetId }) =>
            !existingSet.has(`${newSourceId}:${targetId}`) && !isRepublishedEntry(newSourceId)
        )
        .map(({ relation, newSourceId, originalOrder }) => ({
          ...omit(strapi.db.metadata.identifiers.ID_COLUMN, relation),
          [sourceColumn]: newSourceId,
          [orderColumn]: originalOrder,
        }));

      if (toInsert.length) {
        const batchSize = strapi.db.dialect.getBatchInsertSize();
        await trx.batchInsert(joinTable.name, toInsert, batchSize);
      }
    }
  });
};

export { load, sync };
