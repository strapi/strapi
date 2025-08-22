import type { Database } from '../..';
import type { Attribute, RelationalAttribute, JoinTable, MorphJoinTable } from '../../types';

/**
 * Finds the parent entity that contains a specific component instance
 * by querying ALL component join tables (since we can't detect components in metadata)
 */
const findComponentParent = async (
  db: Database,
  componentModel: any,
  componentId: string
): Promise<{ table: string; parentId: string } | null> => {
  try {
    // Get all models to find potential parents
    const mdValues = db.metadata.values();
    const allModels = Array.from(mdValues);

    for (const model of allModels) {
      // Check if this model has a component join table
      const cmpsTableName = `${model.tableName}_cmps`;

      try {
        const hasTable = await db.connection.schema.hasTable(cmpsTableName);
        if (!hasTable) {
          continue;
        }

        // Query for this component instance in this parent's component join table
        const parentRow = await db
          .connection(cmpsTableName)
          .where({
            cmp_id: componentId,
            component_type: componentModel.uid,
          })
          .first();

        if (parentRow) {
          const result = {
            table: model.tableName,
            parentId: parentRow.entity_id,
          };

          return result;
        }
      } catch (error) {
        // Continue to next parent if query fails
        continue;
      }
    }

    // No parent found
    return null;
  } catch (error) {
    db.logger.debug(`Error finding component parent: ${error}`);
    return null;
  }
};

/**
 * Removes orphaned unidirectional relations from component join tables.
 *
 * This function specifically targets "ghost/orphaned relations" that occur in components
 * with draft/publish functionality where join table entries persist after
 * relations are removed in the UI, causing API/admin interface inconsistencies.
 *
 * @param db - The database object containing metadata and a Knex connection.
 */
export const removeOrphanUnidirectionalRelations = async (db: Database) => {
  let totalCleaned = 0;

  const mdValues = db.metadata.values();
  const mdArray = Array.from(mdValues);

  if (mdArray.length === 0) {
    return 0;
  }

  for (const model of mdArray) {
    const unidirectionalRelations = getUnidirectionalRelations(model.attributes || {});

    for (const relation of unidirectionalRelations) {
      if (hasJoinTable(relation) && hasTarget(relation)) {
        const cleaned = await cleanComponentJoinTable(
          db,
          relation.joinTable.name,
          relation as RelationalAttribute & {
            joinTable: JoinTable | MorphJoinTable;
            target: string;
          },
          model
        );
        totalCleaned += cleaned;
      }
    }
  }

  db.logger.debug(
    `Orphan unidirectional relations repair completed. Cleaned ${totalCleaned} orphaned entries.`
  );

  return totalCleaned;
};

/**
 * Type guard to check if a relation has a joinTable property
 */
const hasJoinTable = (
  relation: RelationalAttribute
): relation is RelationalAttribute & { joinTable: JoinTable | MorphJoinTable } => {
  return 'joinTable' in relation && relation.joinTable != null;
};

/**
 * Type guard to check if a relation has a target property
 */
const hasTarget = (
  relation: RelationalAttribute
): relation is RelationalAttribute & { target: string } => {
  return 'target' in relation && typeof relation.target === 'string';
};

/**
 * Identifies unidirectional relations (relations without inversedBy or mappedBy)
 */
const getUnidirectionalRelations = (
  attributes: Record<string, Attribute>
): RelationalAttribute[] => {
  return Object.values(attributes).filter((attribute): attribute is RelationalAttribute => {
    if (attribute.type !== 'relation') {
      return false;
    }

    const relAttribute = attribute as RelationalAttribute;

    // Check if it's unidirectional (no inversedBy or mappedBy)
    return !('inversedBy' in relAttribute) && !('mappedBy' in relAttribute);
  });
};

/**
 * Checks if a table supports draft/publish by looking for entries with published_at IS NULL
 * Non-D&P content types always have published_at with a value
 * D&P content types can have published_at IS NULL (draft entries)
 */
const supportsDraftAndPublish = async (db: Database, tableName: string): Promise<boolean> => {
  try {
    const hasColumn = await db.connection.schema.hasColumn(tableName, 'published_at');
    if (!hasColumn) {
      return false;
    }

    // Check if there are any entries where published_at is null (indicates D&P)
    const draftEntries = await db.connection(tableName).where('published_at', null).limit(1);

    const supportsDraftPublish = draftEntries.length > 0;

    return supportsDraftPublish;
  } catch (error) {
    return false;
  }
};

/**
 * Cleans ghost relations with publication state mismatches from a join table
 */
const cleanComponentJoinTable = async (
  db: Database,
  joinTableName: string,
  relation: RelationalAttribute & { joinTable: JoinTable | MorphJoinTable; target: string },
  sourceModel: any
): Promise<number> => {
  try {
    // Get the target model metadata
    const targetModel = db.metadata.get(relation.target);
    if (!targetModel) {
      db.logger.debug(`Target model ${relation.target} not found, skipping ${joinTableName}`);
      return 0;
    }

    // For component relations, only check if target supports draft/publish
    const targetSupportsDraftPublish = await supportsDraftAndPublish(db, targetModel.tableName);

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

/**
 * Finds join table entries with publication state mismatches
 * Now includes instance-level parent checking to only process entries from D&P parents
 */
const findPublicationStateMismatches = async (
  db: Database,
  joinTableName: string,
  relation: RelationalAttribute & { joinTable: JoinTable | MorphJoinTable; target: string },
  targetModel: any,
  sourceModel: any
): Promise<number[]> => {
  try {
    // Get join column names from the relation metadata
    const joinTable = relation.joinTable as JoinTable;
    const sourceColumn = joinTable.joinColumn.name;
    const targetColumn = joinTable.inverseJoinColumn.name;

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

    // Check if this is a component join table
    const isComponentJoinTable = joinTableName.match(/^components_.*_.*_lnk$/);
    const isComponentModel =
      !sourceModel.uid?.startsWith('api::') &&
      !sourceModel.uid?.startsWith('plugin::') &&
      sourceModel.uid?.includes('.');

    // Check for draft/publish inconsistencies
    // Only remove relations where same component points to both draft and published versions
    for (const [sourceId, entries] of Object.entries(entriesBySource)) {
      if (entries.length <= 1) continue;

      // For component join tables, check if the parent of this component instance supports D&P
      if (isComponentJoinTable && isComponentModel) {
        try {
          // Find the parent entity that contains this component instance
          const parentInfo = await findComponentParent(db, sourceModel, sourceId);

          if (parentInfo) {
            const parentSupportsDP = await supportsDraftAndPublish(db, parentInfo.table);
            db.logger.debug(`Parent ${parentInfo.table} supports D&P: ${parentSupportsDP}`);
            if (!parentSupportsDP) {
              // Parent doesn't support D&P, skip
              continue;
            }
          } else {
            // No parent found for component, skip
            continue;
          }
        } catch (error) {
          // Skip on error
          continue;
        }
      }

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
