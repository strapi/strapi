/* eslint-disable no-continue */
import { keyBy } from 'lodash/fp';
import { async } from '@strapi/utils';
import type { UID, Schema } from '@strapi/types';

interface LoadContext {
  oldVersions: { id: string; locale: string }[];
  newVersions: { id: string; locale: string }[];
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
const load = async (uid: UID.ContentType, { oldVersions, newVersions }: LoadContext) => {
  const relationsToUpdate = [] as any;

  await strapi.db.transaction(async ({ trx }) => {
    const contentTypes = Object.values(strapi.contentTypes) as Schema.ContentType[];
    const components = Object.values(strapi.components) as Schema.Component[];

    for (const model of [...contentTypes, ...components]) {
      const dbModel = strapi.db.metadata.get(model.uid);

      for (const attribute of Object.values(dbModel.attributes) as any) {
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

        // For entries being published that have no prior published version (e.g. after
        // unpublish→republish), the draft link table still holds the correct relation
        // order.
        // Capture those draft-side relations so sync() can restore the order on
        // the newly created published link rows.
        if (!strapi.contentTypes[model.uid as UID.ContentType]) {
          continue;
        }

        const oldLocales = new Set(oldVersions.map((e) => e.locale));
        const draftsWithoutPublished = newVersions.filter((v) => !oldLocales.has(v.locale));

        if (draftsWithoutPublished.length === 0) {
          continue;
        }

        const draftIds = draftsWithoutPublished.map((e) => e.id);

        const draftRelations = await strapi.db
          .getConnection()
          .select('*')
          .from(joinTable.name)
          .whereIn(targetColumnName, draftIds)
          .transacting(trx);

        if (draftRelations.length === 0) {
          continue;
        }

        const sourceCol = joinTable.joinColumn.name;

        if (model.options?.draftAndPublish) {
          // The join column points at draft IDs of the related entity.
          // We need to map those to published IDs so sync() can match them.
          const relatedMeta = strapi.db.metadata.get(model.uid);
          const relatedDraftIds = [
            ...new Set(draftRelations.map((relation: any) => relation[sourceCol])),
          ];

          const draftEntries = await strapi.db
            .getConnection()
            .select('id', 'document_id', 'locale')
            .from(relatedMeta.tableName)
            .whereIn('id', relatedDraftIds)
            .transacting(trx);

          const pubEntries = await strapi.db
            .getConnection()
            .select('id', 'document_id', 'locale')
            .from(relatedMeta.tableName)
            .whereNotNull('published_at')
            .whereIn(
              'document_id',
              draftEntries.map((entry: any) => entry.document_id)
            )
            .transacting(trx);

          // Build draft→published map keyed by document_id + locale
          const pubByKey = new Map(
            pubEntries.map((entry: any) => [`${entry.document_id}_${entry.locale}`, entry.id])
          );

          const draftToPubMap = new Map<string, string>();
          for (const draft of draftEntries) {
            const pubId = pubByKey.get(`${draft.document_id}_${draft.locale}`);
            if (pubId) {
              draftToPubMap.set(String(draft.id), String(pubId));
            }
          }

          const transformed = draftRelations
            .filter((relation: any) => draftToPubMap.has(String(relation[sourceCol])))
            .map((relation: any) => ({
              ...relation,
              [sourceCol]: draftToPubMap.get(String(relation[sourceCol])),
            }));

          if (transformed.length > 0) {
            relationsToUpdate.push({ joinTable, relations: transformed });
          }
        } else {
          // No D&P on the related model – IDs are the same for draft and published
          relationsToUpdate.push({ joinTable, relations: draftRelations });
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
  existingRelations: { joinTable: any; relations: any[] }[]
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

  await strapi.db.transaction(async ({ trx }) => {
    for (const { joinTable, relations } of existingRelations) {
      const sourceColumn = joinTable.inverseJoinColumn.name;
      const targetColumn = joinTable.joinColumn.name;
      const orderColumn = joinTable.orderColumnName;

      // Failsafe in case those don't exist
      if (!sourceColumn || !targetColumn || !orderColumn) {
        continue;
      }

      // Update order values for each relation
      // TODO: Find a way to batch it more efficiently
      await async.map(relations, (relation: any) => {
        const {
          [sourceColumn]: oldSourceId,
          [targetColumn]: targetId,
          [orderColumn]: originalOrder,
        } = relation;

        // Update the order column for the new relation entry
        return trx
          .from(joinTable.name)
          .where(sourceColumn, entryIdMapping[oldSourceId])
          .where(targetColumn, targetId)
          .update({ [orderColumn]: originalOrder });
      });
    }
  });
};

export { load, sync };
