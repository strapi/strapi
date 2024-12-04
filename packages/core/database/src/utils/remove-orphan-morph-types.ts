import type { Database } from '..';
import { Attribute, RelationalAttribute } from '../types';

/**
 * Removes morph relation data with invalid or non-existent morph types.
 *
 * This function iterates over the database metadata to identify morph relationships
 * (relations with a `joinTable` containing the specified pivot column) and removes
 * any entries in the relation's join table where the morph type is invalid.
 *
 * Note: This function does not check for orphaned IDs, only orphaned morph types.
 *
 * @param db - The database object containing metadata and a Knex connection.
 * @param pivot - The name of the column in the join table representing the morph type.
 */
export const removeOrphanMorphTypes = async (db: Database, pivot: string) => {
  const isRelationWithJoinTable = (
    attribute: Attribute
  ): attribute is RelationalAttribute & { joinTable: { name: string; pivotColumns: string[] } } => {
    return (
      attribute.type === 'relation' &&
      'joinTable' in attribute &&
      attribute.joinTable !== undefined &&
      'target' in attribute &&
      'name' in attribute.joinTable &&
      'pivotColumns' in attribute.joinTable &&
      attribute.joinTable.pivotColumns.includes(pivot)
    );
  };

  for (const model of db.metadata.values()) {
    const attributes = Object.values(model.attributes || {}).filter(isRelationWithJoinTable);

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
          db.logger.warn(
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
