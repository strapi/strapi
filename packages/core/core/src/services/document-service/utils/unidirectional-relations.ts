/* eslint-disable no-continue */
import { keyBy, omit } from 'lodash/fp';

import { UID, Schema } from '@strapi/types';

interface LoadContext {
  publishedVersions: { id: string; locale: string }[];
  draftVersions: { id: string; locale: string }[];
}

/**
 * Loads lingering relations that need to be updated when overriding a published or draft entry.
 * This is necessary because the relations are uni-directional and the target entry is not aware of the source entry.
 * This is not the case for bi-directional relations, where the target entry is also linked to the source entry.
 */
const load = async (uid: UID.ContentType, { publishedVersions, draftVersions }: LoadContext) => {
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
        if (
          attribute.type !== 'relation' ||
          attribute.target !== uid ||
          attribute.inversedBy ||
          attribute.mappedBy
        ) {
          continue;
        }

        // TODO: joinColumn relations
        const joinTable = attribute.joinTable;
        if (!joinTable) {
          continue;
        }

        const { name } = joinTable.inverseJoinColumn;

        /**
         * Load all relations that need to be updated
         */

        const oldPublishedByLocale = keyBy('locale', publishedVersions);

        // NOTE: when the model has draft and publish, we can assume relation are only draft to draft & published to published
        const oldEntriesIds = publishedVersions.map((entry) => entry.id);

        const oldPublishedRelations = await strapi.db
          .getConnection()
          .select('*')
          .from(joinTable.name)
          .whereIn(name, oldEntriesIds)
          .transacting(trx);

        if (oldPublishedRelations.length > 0) {
          updates.push({ joinTable, relations: oldPublishedRelations });
        }

        if (!model.options?.draftAndPublish) {
          const oldEntriesIds = draftVersions
            .filter((entry) => {
              return !oldPublishedByLocale[entry.locale];
            })
            .map((entry) => entry.id);

          const draftRelations = await strapi.db
            .getConnection()
            .select('*')
            .from(joinTable.name)
            .whereIn(name, oldEntriesIds)
            .transacting(trx);

          if (draftRelations.length > 0) {
            updates.push({ joinTable, relations: draftRelations.map(omit('id')) });
          }
        }
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
    // Iterate old relations that are deleted and insert the new ones
    for (const { joinTable, relations } of oldRelations) {
      // Update old ids with the new ones
      const column = joinTable.inverseJoinColumn.name;

      const newRelations = relations.map((relation) => {
        const newId = oldEntriesMap[relation[column]];
        return { ...relation, [column]: newId };
      });

      // Insert those relations into the join table
      await trx.batchInsert(joinTable.name, newRelations, 1000);
    }
  });
};

export { load, sync };
