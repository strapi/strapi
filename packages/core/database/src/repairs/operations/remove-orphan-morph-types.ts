import type { Database } from '../..';
import type { Attribute, MorphRelationalAttribute } from '../../types';

export interface RemoveOrphanMorphTypeOptions {
  pivot: string;
}

const isMorphRelationWithPivot = (
  attribute: Attribute,
  pivot: string
): attribute is MorphRelationalAttribute => {
  return (
    attribute.type === 'relation' &&
    'relation' in attribute &&
    'joinTable' in attribute &&
    'name' in attribute.joinTable &&
    'pivotColumns' in attribute.joinTable &&
    attribute.joinTable.pivotColumns.includes(pivot)
  );
};

const filterMorphRelationalAttributes = (
  attributes: Record<string, Attribute>,
  pivot: string
): MorphRelationalAttribute[] => {
  return Object.values(attributes).filter((attribute): attribute is MorphRelationalAttribute =>
    isMorphRelationWithPivot(attribute, pivot)
  );
};

/**
 * Removes morph relation data with invalid or non-existent morph type.
 *
 * This function iterates over the database metadata to identify morph relationships
 * (relations with a `joinTable` containing the specified pivot column) and removes
 * any entries in the relation's join table where the morph type is invalid.
 *
 * Note: This function does not check for orphaned IDs, only orphaned morph types.
 *
 * @param db - The database object containing metadata and a Knex connection.
 * @param options.pivot - The name of the column in the join table representing the morph type.
 */
export const removeOrphanMorphType = async (
  db: Database,
  { pivot }: RemoveOrphanMorphTypeOptions
) => {
  db.logger.debug(`Removing orphaned morph type: ${JSON.stringify(pivot)}`);

  const mdValues = db.metadata.values();
  for (const model of mdValues) {
    const attributes = filterMorphRelationalAttributes(model.attributes || {}, pivot);

    for (const attribute of attributes) {
      const joinTableName = attribute.joinTable.name;

      // Query distinct morph types from the join table
      const morphTypes = await db.connection(joinTableName).distinct(pivot).pluck(pivot);

      for (const morphType of morphTypes) {
        // Check if metadata for the morph type exists
        const deleteComponentType = await (async () => {
          try {
            return !db.metadata.get(morphType); // If no metadata found, mark for deletion
          } catch {
            db.logger.debug(
              `Metadata for morph type "${morphType}" in table "${joinTableName}" not found`
            );
            return true; // Return true to delete if metadata is missing
          }
        })();

        if (deleteComponentType) {
          db.logger.debug(
            `Removing invalid morph type "${morphType}" from table "${joinTableName}".`
          );
          try {
            await db.connection(joinTableName).where(pivot, morphType).del();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            db.logger.error(
              `Failed to remove invalid morph type "${morphType}" from table "${joinTableName}": ${errorMessage}`
            );
          }
        }
      }
    }
  }
};
