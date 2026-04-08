/* eslint-disable no-continue */
import { keyBy, omit } from 'lodash/fp';
import type { UID } from '@strapi/types';
import type { JoinTable } from '@strapi/database';

interface VersionEntry {
  id: string;
  locale: string;
}

interface RelationData {
  joinTable: JoinTable;
  relations: Record<string, unknown>[];
}

/**
 * Preserves self-referential relations during publish/discard operations.
 *
 * When publishing or discarding a draft, self-referential relations (where both sides
 * of the relation belong to the same content type) are lost because:
 *
 * 1. The old entry is deleted
 * 2. A new entry is created with relations resolved via documentId → entity ID mapping
 * 3. At mapping time, the old entity is already deleted and the new one doesn't exist yet
 * 4. The relation is silently dropped
 *
 * This utility:
 * 1. Captures self-referential join table rows before deletion
 * 2. Remaps old entity IDs to new entity IDs after creation
 * 3. Inserts the remapped relations
 */

/**
 * Loads self-referential relations from source entries before they are deleted/recreated.
 */
const load = async (
  uid: UID.ContentType,
  sourceEntries: VersionEntry[]
): Promise<RelationData[]> => {
  const updates: RelationData[] = [];
  const dbModel = strapi.db.metadata.get(uid);

  await strapi.db.transaction(async ({ trx }) => {
    for (const attribute of Object.values(dbModel.attributes) as any) {
      if (attribute.type !== 'relation' || attribute.target !== uid) {
        continue;
      }

      // Bidirectional inverse side (e.g. `children` mappedBy `parent`) shares the same physical
      // join table as the owning attribute; processing both would duplicate rows and inserts.
      if (attribute.mappedBy) {
        continue;
      }

      const joinTable = attribute.joinTable;
      if (!joinTable) {
        continue;
      }

      const { name: sourceColumnName } = joinTable.joinColumn;
      const { name: targetColumnName } = joinTable.inverseJoinColumn;

      const sourceIds = sourceEntries.map((entry) => String(entry.id));

      // Load relations where both source and target are among the entries being processed.
      // These are the self-referential relations that would be lost during the
      // delete-and-recreate cycle.
      const selfRelations = await strapi.db
        .getConnection()
        .select('*')
        .from(joinTable.name)
        .whereIn(sourceColumnName, sourceIds)
        .whereIn(targetColumnName, sourceIds)
        .transacting(trx);

      if (selfRelations.length > 0) {
        updates.push({ joinTable, relations: selfRelations });
      }
    }
  });

  return updates;
};

/**
 * Syncs self-referential relations by remapping old entry IDs to new entry IDs
 * and inserting the remapped relations into the join table.
 */
const sync = async (
  sourceEntries: VersionEntry[],
  targetEntries: VersionEntry[],
  relationData: RelationData[]
) => {
  if (relationData.length === 0) return;

  const targetEntriesByLocale = keyBy('locale', targetEntries);

  // Map source entry IDs → target entry IDs based on locale (string keys for DB/driver consistency)
  const idMapping = sourceEntries.reduce(
    (acc, sourceEntry) => {
      const targetEntry = targetEntriesByLocale[sourceEntry.locale];
      if (!targetEntry) return acc;
      acc[String(sourceEntry.id)] = String(targetEntry.id);
      return acc;
    },
    {} as Record<string, string>
  );

  const batchSize = strapi.db.dialect.getBatchInsertSize();

  await strapi.db.transaction(async ({ trx }) => {
    for (const { joinTable, relations } of relationData) {
      const sourceColumn = joinTable.joinColumn.name;
      const targetColumn = joinTable.inverseJoinColumn.name;

      const newRelations = relations
        .map((relation) => {
          const oldSourceId = String(relation[sourceColumn]);
          const oldTargetId = String(relation[targetColumn]);
          const newSourceId = idMapping[oldSourceId];
          const newTargetId = idMapping[oldTargetId];

          // Both sides must map to new entries
          if (!newSourceId || !newTargetId) return null;

          return {
            ...omit(strapi.db.metadata.identifiers.ID_COLUMN, relation),
            [sourceColumn]: newSourceId,
            [targetColumn]: newTargetId,
          };
        })
        .filter(Boolean) as Record<string, unknown>[];

      const pairKey = (r: Record<string, unknown>) =>
        `${String(r[sourceColumn])}:${String(r[targetColumn])}`;
      const seenPairs = new Set<string>();
      const deduped = newRelations.filter((r) => {
        const key = pairKey(r);
        if (seenPairs.has(key)) return false;
        seenPairs.add(key);
        return true;
      });

      if (deduped.length === 0) continue;

      const newSourceIds = [...new Set(deduped.map((r) => String(r[sourceColumn])))];
      const existingRows = await trx(joinTable.name)
        .whereIn(sourceColumn, newSourceIds)
        .select(sourceColumn, targetColumn);

      const existingSet = new Set(existingRows.map((r: Record<string, unknown>) => pairKey(r)));
      const toInsert = deduped.filter((r) => !existingSet.has(pairKey(r)));

      if (toInsert.length > 0) {
        await trx.batchInsert(joinTable.name, toInsert as any[], batchSize);
      }
    }
  });
};

export { load, sync };
