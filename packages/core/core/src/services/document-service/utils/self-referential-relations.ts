/* eslint-disable no-continue */
import { keyBy, omit } from 'lodash/fp';
import type { UID } from '@strapi/types';

interface VersionEntry {
  id: string;
  locale: string;
}

interface RelationData {
  joinTable: any;
  relations: Record<string, any>[];
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

      const joinTable = attribute.joinTable;
      if (!joinTable) {
        continue;
      }

      const { name: sourceColumnName } = joinTable.joinColumn;
      const { name: targetColumnName } = joinTable.inverseJoinColumn;

      const sourceIds = sourceEntries.map((entry) => entry.id);

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

  // Map source entry IDs → target entry IDs based on locale
  const idMapping = sourceEntries.reduce(
    (acc, sourceEntry) => {
      const targetEntry = targetEntriesByLocale[sourceEntry.locale];
      if (!targetEntry) return acc;
      acc[sourceEntry.id] = targetEntry.id;
      return acc;
    },
    {} as Record<string, string>
  );

  await strapi.db.transaction(async ({ trx }) => {
    for (const { joinTable, relations } of relationData) {
      const sourceColumn = joinTable.joinColumn.name;
      const targetColumn = joinTable.inverseJoinColumn.name;

      const newRelations = relations
        .map((relation) => {
          const newSourceId = idMapping[relation[sourceColumn]];
          const newTargetId = idMapping[relation[targetColumn]];

          // Both sides must map to new entries
          if (!newSourceId || !newTargetId) return null;

          return {
            ...omit(strapi.db.metadata.identifiers.ID_COLUMN, relation),
            [sourceColumn]: newSourceId,
            [targetColumn]: newTargetId,
          };
        })
        .filter(Boolean);

      if (newRelations.length > 0) {
        await trx.batchInsert(joinTable.name, newRelations as any[], 1000);
      }
    }
  });
};

export { load, sync };
