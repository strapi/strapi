import type { Database } from '../..';

/**
 * Iterates over all models and their unidirectional relations, invoking a provided operation on each join table.
 *
 * This function does not perform any cleaning or modification itself. Instead, it identifies all unidirectional
 * relations (relations without inversedBy or mappedBy) that use join tables, and delegates any join table operation
 * (such as cleaning, validation, or analysis) to the provided operateOnJoinTable function.
 *
 * @param db - The database instance
 * @param operateOnJoinTable - A function to execute for each unidirectional join table relation
 * @returns The sum of results returned by operateOnJoinTable for all processed relations
 */
export const processUnidirectionalJoinTables = async (
  db: Database,
  operateOnJoinTable: (
    db: Database,
    joinTableName: string,
    relation: any,
    sourceModel: any
  ) => Promise<number>
): Promise<number> => {
  let totalResult = 0;

  const mdValues = db.metadata.values();
  const mdArray = Array.from(mdValues);

  if (mdArray.length === 0) {
    return 0;
  }

  db.logger.debug('Starting unidirectional join table operation');

  for (const model of mdArray) {
    const unidirectionalRelations = getUnidirectionalRelations(model.attributes || {});

    for (const relation of unidirectionalRelations) {
      if (hasJoinTable(relation) && hasTarget(relation)) {
        const result = await operateOnJoinTable(db, relation.joinTable.name, relation, model);
        totalResult += result;
      }
    }
  }

  db.logger.debug(
    `Unidirectional join table operation completed. Processed ${totalResult} entries.`
  );

  return totalResult;
};

/**
 * Identifies unidirectional relations (relations without inversedBy or mappedBy)
 * Uses same logic as prevention fix in unidirectional-relations.ts:54-61
 */
const getUnidirectionalRelations = (attributes: Record<string, any>): any[] => {
  return Object.values(attributes).filter((attribute) => {
    if (attribute.type !== 'relation') {
      return false;
    }

    // Check if it's unidirectional (no inversedBy or mappedBy) - same as prevention logic
    return !attribute.inversedBy && !attribute.mappedBy;
  });
};

/**
 * Type guard to check if a relation has a joinTable property
 */
const hasJoinTable = (relation: any): boolean => {
  return 'joinTable' in relation && relation.joinTable != null;
};

/**
 * Type guard to check if a relation has a target property
 */
const hasTarget = (relation: any): boolean => {
  return 'target' in relation && typeof relation.target === 'string';
};
