import type { Database } from '@strapi/database';
import type { Schema } from '@strapi/types';
import { findComponentParent, getParentSchemasForComponent } from '../components';

/**
 * Cleans ghost relations with publication state mismatches from a join table
 * Uses schema-based draft/publish checking like prevention fix
 */
export const cleanComponentJoinTable = async (
  db: Database,
  joinTableName: string,
  relation: any,
  sourceModel: any
): Promise<number> => {
  try {
    // Get the target model metadata
    const targetModel = db.metadata.get(relation.target);
    if (!targetModel) {
      db.logger.debug(`Target model ${relation.target} not found, skipping ${joinTableName}`);
      return 0;
    }

    // Check if source supports draft/publish, if it doesnt it should contain duplicate states
    const sourceContentType = strapi.contentTypes[sourceModel.uid];
    // It could be a model, which does not have the draftAndPublish option
    const sourceSupportsDraftPublish = sourceContentType?.options?.draftAndPublish;

    if (sourceContentType && !sourceSupportsDraftPublish) {
      return 0;
    }

    // Check if target supports draft/publish using schema-based approach (like prevention fix)
    const targetContentType =
      strapi.contentTypes[relation.target as keyof typeof strapi.contentTypes];
    const targetSupportsDraftPublish = targetContentType?.options?.draftAndPublish || false;

    if (!targetSupportsDraftPublish) {
      return 0;
    }

    // Find entries with publication state mismatches
    const ghostEntries = await findPublicationStateMismatches(
      db,
      joinTableName,
      relation,
      targetModel,
      sourceModel
    );

    if (ghostEntries.length === 0) {
      return 0;
    }

    // Remove ghost entries
    await db.connection(joinTableName).whereIn('id', ghostEntries).del();
    db.logger.debug(
      `Removed ${ghostEntries.length} ghost relations with publication state mismatches from ${joinTableName}`
    );

    return ghostEntries.length;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    db.logger.error(`Failed to clean join table "${joinTableName}": ${errorMessage}`);
    return 0;
  }
};

const findContentTypeParentForComponentInstance = async (
  componentSchema: Schema.Component,
  componentId: number | string
): Promise<{ uid: string; table: string; parentId: number | string } | null> => {
  // Get the parent schemas that could contain this component
  const parentSchemas = getParentSchemasForComponent(componentSchema);
  if (parentSchemas.length === 0) {
    // No potential parents
    return null;
  }

  // Find the actual parent for THIS specific component instance
  const parent = await findComponentParent(componentSchema, componentId, parentSchemas);
  if (!parent) {
    // No parent found for this component instance
    return null;
  }

  if (strapi.components[parent.uid as keyof typeof strapi.components]) {
    // If the parent is a component, we need to check its parents recursively
    const parentComponentSchema = strapi.components[parent.uid as keyof typeof strapi.components];
    return findContentTypeParentForComponentInstance(parentComponentSchema, parent.parentId);
  }

  if (strapi.contentTypes[parent.uid as keyof typeof strapi.contentTypes]) {
    // Found a content type parent
    return parent;
  }

  return null;
};

/**
 * Finds join table entries with publication state mismatches
 * Uses existing component parent detection from document service
 */
const findPublicationStateMismatches = async (
  db: Database,
  joinTableName: string,
  relation: any,
  targetModel: any,
  sourceModel: any
): Promise<number[]> => {
  try {
    // Get join column names using proper functions (addressing PR feedback)
    const sourceColumn = relation.joinTable.joinColumn.name;
    const targetColumn = relation.joinTable.inverseJoinColumn.name;

    // Get all join entries with their target entities
    const query = db
      .connection(joinTableName)
      .select(
        `${joinTableName}.id as join_id`,
        `${joinTableName}.${sourceColumn} as source_id`,
        `${joinTableName}.${targetColumn} as target_id`,
        `${targetModel.tableName}.published_at as target_published_at`
      )
      .leftJoin(
        targetModel.tableName,
        `${joinTableName}.${targetColumn}`,
        `${targetModel.tableName}.id`
      );

    const joinEntries = await query;

    // Group by source_id to find duplicates pointing to draft/published versions of same entity
    const entriesBySource: { [key: string]: any[] } = {};
    for (const entry of joinEntries) {
      const sourceId = entry.source_id;
      if (!entriesBySource[sourceId]) {
        entriesBySource[sourceId] = [];
      }
      entriesBySource[sourceId].push(entry);
    }

    const ghostEntries: number[] = [];

    // Check if this is a join table (ends with _lnk)
    const isRelationJoinTable = joinTableName.endsWith('_lnk');
    const isComponentModel =
      !sourceModel.uid?.startsWith('api::') &&
      !sourceModel.uid?.startsWith('plugin::') &&
      sourceModel.uid?.includes('.');

    // Check for draft/publish inconsistencies
    for (const [sourceId, entries] of Object.entries(entriesBySource)) {
      // Skip entries with single relations
      if (entries.length <= 1) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // For component join tables, check if THIS specific component instance's parent supports D&P
      if (isRelationJoinTable && isComponentModel) {
        try {
          const componentSchema = strapi.components[sourceModel.uid] as Schema.Component;
          if (!componentSchema) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const parent = await findContentTypeParentForComponentInstance(componentSchema, sourceId);
          if (!parent) {
            continue;
          }

          // Check if THIS component instance's parent supports draft/publish
          const parentContentType =
            strapi.contentTypes[parent.uid as keyof typeof strapi.contentTypes];
          if (!parentContentType?.options?.draftAndPublish) {
            // This component instance's parent does NOT support D&P - skip cleanup
            // eslint-disable-next-line no-continue
            continue;
          }

          // If we reach here, this component instance's parent DOES support D&P
          // Continue to process this component instance for ghost relations
        } catch (error) {
          // Skip this component instance on error
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      // Find ghost relations (same logic as original but with improved parent checking)
      for (const entry of entries) {
        if (entry.target_published_at === null) {
          // This is a draft target - find its published version
          const draftTarget = await db
            .connection(targetModel.tableName)
            .select('document_id')
            .where('id', entry.target_id)
            .first();

          if (draftTarget) {
            const publishedVersion = await db
              .connection(targetModel.tableName)
              .select('id', 'document_id')
              .where('document_id', draftTarget.document_id)
              .whereNotNull('published_at')
              .first();

            if (publishedVersion) {
              // Check if we also have a relation to the published version
              const publishedRelation = entries.find((e) => e.target_id === publishedVersion.id);
              if (publishedRelation) {
                ghostEntries.push(publishedRelation.join_id);
              }
            }
          }
        }
      }
    }

    return ghostEntries;
  } catch (error) {
    return [];
  }
};
