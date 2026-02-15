/* eslint-disable no-continue */
import { keyBy, omit } from 'lodash/fp';
import type { UID } from '@strapi/types';

interface VersionEntry {
  id: string;
  locale: string;
}

/**
 * After publishing or discarding a draft, self-referential relations (where an entry
 * relates to another entry of the same content type) may be lost. This happens because
 * the transform step maps relation documentIds to entity IDs, but the new version's
 * entity ID doesn't exist yet at transform time.
 *
 * This utility loads self-referential relations from the source entries (e.g., drafts)
 * and replicates them for the newly created entries (e.g., published versions),
 * mapping old IDs to new IDs.
 */

interface RelationData {
  joinTable: any;
  relations: Record<string, any>[];
}

/**
 * Loads self-referential relations from draft entries that need to be synced
 * to newly created published entries.
 */
const load = async (
  uid: UID.ContentType,
  sourceEntries: VersionEntry[]
): Promise<RelationData[]> => {
  const updates: RelationData[] = [];

  const dbModel = strapi.db.metadata.get(uid);

  await strapi.db.transaction(async ({ trx }) => {
    for (const attribute of Object.values(dbModel.attributes) as any) {
      // Only consider relations that target the same content type (self-referential)
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

      // Load relations where the source entry is the one being published
      // These are the "outgoing" self-referential relations
      const outgoingRelations = await strapi.db
        .getConnection()
        .select('*')
        .from(joinTable.name)
        .whereIn(sourceColumnName, sourceIds)
        // Only get relations where the target is also one of the source entries (self-referencing)
        .whereIn(targetColumnName, sourceIds)
        .transacting(trx);

      if (outgoingRelations.length > 0) {
        updates.push({ joinTable, relations: outgoingRelations });
      }
    }
  });

  return updates;
};

/**
 * Syncs self-referential relations by inserting new join table entries
 * that map the old entry IDs to the new entry IDs.
 *
 * @param sourceEntries - The original entries (e.g., draft entries)
 * @param targetEntries - The newly created entries (e.g., published entries)
 * @param relationData - The self-referential relations loaded from the source entries
 */
const sync = async (
  sourceEntries: VersionEntry[],
  targetEntries: VersionEntry[],
  relationData: RelationData[]
) => {
  if (relationData.length === 0) return;

  const targetEntriesByLocale = keyBy('locale', targetEntries);

  // Create a mapping of source entry IDs to target entry IDs based on locale
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

          // Both source and target must map to new entries
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
