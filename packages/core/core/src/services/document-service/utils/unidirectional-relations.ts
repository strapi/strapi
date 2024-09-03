/* eslint-disable no-continue */
import { keyBy } from 'lodash/fp';

import { UID, Schema } from '@strapi/types';

/**
 * Loads lingering relations that need to be updated when overriding a published or draft entry.
 * This is necessary because the relations are uni-directional and the target entry is not aware of the source entry.
 * This is not the case for bi-directional relations, where the target entry is also linked to the source entry.
 *
 * @param uid The content type uid
 * @param oldEntries The old entries that are being overridden
 * @returns An array of relations that need to be updated with the join table reference.
 */
const load = async (uid: UID.ContentType, oldEntries: { id: string; locale: string }[]) => {
  const updates = [] as any;

  // Iterate all components and content types to find relations that need to be updated
  await strapi.db.transaction(async ({ trx }) => {
    const contentTypes = Object.values(strapi.contentTypes) as Schema.ContentType[];
    const components = Object.values(strapi.components) as Schema.Component[];

    for (const model of [...contentTypes, ...components]) {
      const dbModel = strapi.db.metadata.get(model.uid);

      for (const attribute of Object.values(dbModel.attributes) as any) {
        /**
         * Only consider unidirectional relations
         */
        if (attribute.type !== 'relation') continue;
        if (attribute.target !== uid) continue;
        if (attribute.inversedBy || attribute.mappedBy) continue;
        const joinTable = attribute.joinTable;
        // TODO: joinColumn relations
        if (!joinTable) continue;

        const { name } = joinTable.inverseJoinColumn;

        /**
         * Load all relations that need to be updated
         */
        const oldEntriesIds = oldEntries.map((entry) => entry.id);
        const relations = await strapi.db
          .getConnection()
          .select('*')
          .from(joinTable.name)
          .whereIn(name, oldEntriesIds)
          .transacting(trx);

        if (relations.length === 0) continue;

        updates.push({ joinTable, relations });
      }
    }
  });

  return updates;
};

/**
 * Updates uni directional relations to target the right entries when overriding published or draft entries.
 *
 * @param oldEntries The old entries that are being overridden
 * @param newEntries The new entries that are overriding the old ones
 * @param oldRelations The relations that were previously loaded with `load` @see load
 */
const sync = async (
  oldEntries: { id: string; locale: string }[],
  newEntries: { id: string; locale: string }[],
  oldRelations: { joinTable: any; relations: any[] }[]
) => {
  /**
   * Create a map of old entry ids to new entry ids
   *
   * Will be used to update the relation target ids
   */
  const newEntryByLocale = keyBy('locale', newEntries);
  const oldEntriesMap = oldEntries.reduce(
    (acc, entry) => {
      const newEntry = newEntryByLocale[entry.locale];
      if (!newEntry) return acc;
      acc[entry.id] = newEntry.id;
      return acc;
    },
    {} as Record<string, string>
  );

  await strapi.db.transaction(async ({ trx }) => {
    const con = strapi.db.getConnection();

    // Iterate old relations that are deleted and insert the new ones
    for (const { joinTable, relations } of oldRelations) {
      // Update old ids with the new ones
      const newRelations = relations.map((relation) => {
        const column = joinTable.inverseJoinColumn.name;
        const newId = oldEntriesMap[relation[column]];
        return { ...relation, [column]: newId };
      });

      // Insert those relations into the join table
      await con.batchInsert(joinTable.name, newRelations).transacting(trx);
    }
  });
};

export { load, sync };
