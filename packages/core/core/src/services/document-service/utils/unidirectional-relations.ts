/* eslint-disable no-continue */
import { keyBy, omit } from 'lodash/fp';

import type { UID, Schema } from '@strapi/types';

import type { JoinTable } from '@strapi/database';

interface LoadContext {
  oldVersions: { id: string; locale: string }[];
  newVersions: { id: string; locale: string }[];
}

interface RelationUpdate {
  joinTable: JoinTable;
  relations: Record<string, any>[];
}

interface RelationFilterOptions {
  /**
   * Function to determine if a relation should be propagated to new document versions
   * This replaces the hardcoded component-specific logic
   */
  shouldPropagateRelation?: (
    relation: Record<string, any>,
    model: Schema.Component | Schema.ContentType,
    trx: any
  ) => Promise<boolean>;
}

/**
 * Loads lingering relations that need to be updated when overriding a published or draft entry.
 * This is necessary because the relations are uni-directional and the target entry is not aware of the source entry.
 * This is not the case for bi-directional relations, where the target entry is also linked to the source entry.
 */
const load = async (
  uid: UID.ContentType,
  { oldVersions, newVersions }: LoadContext,
  options: RelationFilterOptions = {}
): Promise<RelationUpdate[]> => {
  const updates: RelationUpdate[] = [];

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

        const { name: sourceColumnName } = joinTable.joinColumn;
        const { name: targetColumnName } = joinTable.inverseJoinColumn;

        /**
         * Load all relations that need to be updated
         */
        // NOTE: when the model has draft and publish, we can assume relation are only draft to draft & published to published
        const ids = oldVersions.map((entry) => entry.id);

        const oldVersionsRelations = await strapi.db
          .getConnection()
          .select('*')
          .from(joinTable.name)
          .whereIn(targetColumnName, ids)
          .transacting(trx);

        if (oldVersionsRelations.length > 0) {
          updates.push({ joinTable, relations: oldVersionsRelations });
        }

        /**
         * if publishing
         *  if published version exists
         *    updated published versions links
         *  else
         *    create link to newly published version
         *
         * if discarding
         *    if published version link exists & not draft version link
         *       create link to new draft version
         */
        if (!model.options?.draftAndPublish) {
          const ids = newVersions.map((entry) => entry.id);

          // This is the step were we query the join table based on the id of the document
          const newVersionsRelations = await strapi.db
            .getConnection()
            .select('*')
            .from(joinTable.name)
            .whereIn(targetColumnName, ids)
            .transacting(trx);

          let versionRelations = newVersionsRelations;
          if (options.shouldPropagateRelation) {
            const relationsToPropagate = [];
            for (const relation of newVersionsRelations) {
              if (await options.shouldPropagateRelation(relation, model, trx)) {
                relationsToPropagate.push(relation);
              }
            }
            versionRelations = relationsToPropagate;
          }

          if (versionRelations.length > 0) {
            // when publishing a draft that doesn't have a published version yet,
            // copy the links to the draft over to the published version
            // when discarding a published version, if no drafts exists
            const discardToAdd = versionRelations
              .filter((relation) => {
                const matchingOldVersion = oldVersionsRelations.find((oldRelation) => {
                  return oldRelation[sourceColumnName] === relation[sourceColumnName];
                });

                return !matchingOldVersion;
              })
              .map(omit(strapi.db.metadata.identifiers.ID_COLUMN));

            updates.push({ joinTable, relations: discardToAdd });
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
 * This function:
 * 1. Creates new relations pointing to the new entry versions
 * 2. Precisely deletes only the old relations being replaced to prevent orphaned links
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
export type { RelationFilterOptions };
