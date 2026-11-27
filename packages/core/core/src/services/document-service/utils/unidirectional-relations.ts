import { chunk, keyBy, omit } from 'lodash';

import type { Data, UID, Schema } from '@strapi/types';

import type { JoinTable } from '@strapi/database';

// Stays under the bound parameter limit of every supported database
const ID_CHUNK_SIZE = 500;

interface LoadContext {
  oldVersions: { id: Data.ID; locale: string }[];
  newVersions: { id: Data.ID; locale: string }[];
}

interface RelationUpdate {
  joinTable: JoinTable;
  relations: Record<string, any>[];
}

interface RelationFilterOptions {
  /**
   * Function returning which relations should be propagated to new document versions
   * This replaces the hardcoded component-specific logic
   *
   * It receives all the relations of a join table at once, so it can batch its lookups
   */
  filterRelationsToPropagate?: (
    relations: Record<string, any>[],
    model: Schema.Component | Schema.ContentType,
    trx: any
  ) => Promise<Record<string, any>[]>;
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
         * Only consider unidirectional relations.
         * Bidirectional relations (inversedBy/mappedBy) are handled by bidirectionalRelations.
         * Self-referential relations (model.uid === uid) are included here, but rows where
         * the source entry is also being republished in this same operation are excluded —
         * those are handled by selfReferentialRelations, which remaps both sides simultaneously.
         * Without this guard, we would insert rows pointing to a source entry that is about
         * to be deleted, creating stale foreign-key values.
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

        let oldVersionsQuery = strapi.db
          .getConnection()
          .select('*')
          .from(joinTable.name)
          .whereIn(targetColumnName, ids);

        /**
         * For self-referential relations, exclude join rows where the source entry is also
         * being republished. When both sides are in the same publish batch, selfReferentialRelations
         * already handles remapping them. Including them here too would insert a row whose
         * source FK points at an entry that is about to be deleted.
         */
        if (model.uid === uid && ids.length > 0) {
          oldVersionsQuery = oldVersionsQuery.whereNotIn(sourceColumnName, ids);
        }

        const oldVersionsRelations = await oldVersionsQuery.transacting(trx);

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

          const versionRelations = options.filterRelationsToPropagate
            ? await options.filterRelationsToPropagate(newVersionsRelations, model, trx)
            : newVersionsRelations;

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
              .map((value) => omit(value, strapi.db.metadata.identifiers.ID_COLUMN));

            updates.push({ joinTable, relations: discardToAdd });
          }
        }
      }
    }
  });

  return updates;
};

/**
 * Returns the ids of the link sources that still exist, or null when the source table is unknown.
 *
 * A link loaded before the old entries were deleted can lose its source: a component of an old
 * entry is deleted with it (the new entry gets its own copy). Re-inserting that link would fail
 * on its foreign key.
 */
const getExistingSourceIds = async (
  trx: any,
  joinTable: JoinTable,
  relations: Record<string, any>[]
): Promise<Set<string> | null> => {
  const { referencedTable, referencedColumn, name: sourceColumn } = joinTable.joinColumn;

  if (!referencedTable) {
    return null;
  }

  const sourceIds = [...new Set(relations.map((relation) => relation[sourceColumn]))];
  const existingIds = new Set<string>();

  for (const ids of chunk(sourceIds, ID_CHUNK_SIZE)) {
    const rows = await trx(referencedTable).select(referencedColumn).whereIn(referencedColumn, ids);

    rows.forEach((row: Record<string, unknown>) => existingIds.add(String(row[referencedColumn])));
  }

  return existingIds;
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
  oldEntries: { id: Data.ID; locale: string }[],
  newEntries: { id: Data.ID; locale: string }[],
  oldRelations: { joinTable: any; relations: any[] }[]
) => {
  /**
   * Create a map of old entry ids to new entry ids
   *
   * Will be used to update the relation target ids
   */
  const newEntryByLocale = keyBy(newEntries, 'locale');
  const oldEntriesMap = oldEntries.reduce(
    (acc, entry) => {
      const newEntry = newEntryByLocale[entry.locale];
      if (!newEntry) return acc;
      acc[String(entry.id)] = newEntry.id;
      return acc;
    },
    {} as Record<string, Data.ID>
  );

  await strapi.db.transaction(async ({ trx }) => {
    // Iterate old relations that are deleted and insert the new ones
    for (const { joinTable, relations } of oldRelations) {
      // Update old ids with the new ones
      const column = joinTable.inverseJoinColumn.name;

      const existingSourceIds = await getExistingSourceIds(trx, joinTable, relations);

      const newRelations = relations
        .filter(
          (relation) =>
            existingSourceIds === null ||
            existingSourceIds.has(String(relation[joinTable.joinColumn.name]))
        )
        .map((relation) => {
          const newId = oldEntriesMap[relation[column]];
          return { ...relation, [column]: newId };
        });

      if (newRelations.length === 0) {
        continue;
      }

      const batchSize = strapi.db.dialect.getBatchInsertSize();
      await trx.batchInsert(joinTable.name, newRelations, batchSize);
    }
  });
};

export { load, sync };
export type { RelationFilterOptions };
