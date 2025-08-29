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

/* -------------------------------------------------------------------------------------------------
 * Component Helper Functions
 * -----------------------------------------------------------------------------------------------*/

/**
 * Finds content types that contain the given component and have draft & publish enabled.
 */
const getParentSchemasForComponent = (componentSchema: Schema.Component): Schema.ContentType[] => {
  return Object.values(strapi.contentTypes).filter((contentType: any) => {
    if (!contentType.options?.draftAndPublish) return false;

    return Object.values(contentType.attributes).some((attr: any) => {
      return (
        (attr.type === 'component' && attr.component === componentSchema.uid) ||
        (attr.type === 'dynamiczone' && attr.components?.includes(componentSchema.uid))
      );
    });
  });
};

/**
 * Determines if a component relation should be propagated to a new document version
 * when a document with draft and publish is updated.
 */
const shouldPropagateRelationToNewVersion = async (
  componentRelation: Record<string, any>,
  componentSchema: Schema.Component,
  parentSchemasForComponent: Schema.ContentType[],
  trx: any
): Promise<boolean> => {
  const componentId = componentRelation[`${componentSchema.modelName}_id`];

  const parent = await strapi.db.findComponentParent(
    componentSchema,
    componentId,
    parentSchemasForComponent,
    { trx }
  );

  // Keep relation if component has no parent entry
  if (!parent?.uid) {
    return true;
  }

  const parentContentType = strapi.contentTypes[parent.uid as UID.ContentType];

  // Keep relation if parent doesn't have draft & publish enabled
  if (!parentContentType?.options?.draftAndPublish) {
    return true;
  }

  // Discard relation if parent has draft & publish enabled
  return false;
};

/**
 * Filters component relations to only include those that should be propagated to new document versions.
 * Only relations that are NOT linked to a draft & publish parent type are kept.
 */
const filterComponentRelations = async (
  relations: Record<string, any>[],
  componentSchema: Schema.Component,
  trx: any
): Promise<Record<string, any>[]> => {
  // Exit if no relations to filter
  if (relations.length === 0) {
    return relations;
  }

  const componentParents = getParentSchemasForComponent(componentSchema);

  // Exit if no draft & publish parent types exist
  if (componentParents.length === 0) {
    return relations;
  }

  const relationsToPropagate = [];
  for (const relation of relations) {
    if (
      await shouldPropagateRelationToNewVersion(relation, componentSchema, componentParents, trx)
    ) {
      relationsToPropagate.push(relation);
    }
  }

  return relationsToPropagate;
};

/**
 * Loads lingering relations that need to be updated when overriding a published or draft entry.
 * This is necessary because the relations are uni-directional and the target entry is not aware of the source entry.
 * This is not the case for bi-directional relations, where the target entry is also linked to the source entry.
 */
const load = async (
  uid: UID.ContentType,
  { oldVersions, newVersions }: LoadContext
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

          const filteredRelations =
            model.modelType === 'component'
              ? await filterComponentRelations(newVersionsRelations, model, trx)
              : newVersionsRelations;

          if (filteredRelations.length > 0) {
            // when publishing a draft that doesn't have a published version yet,
            // copy the links to the draft over to the published version
            // when discarding a published version, if no drafts exists
            const discardToAdd = filteredRelations
              .filter((relation) => {
                const matchingOldVersion = oldVersionsRelations.find((oldRelation) => {
                  return oldRelation[sourceColumnName] === relation[sourceColumnName];
                });

                return !matchingOldVersion;
              })
              .map(omit('id'));

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
