import type { Database } from '..';

/**
 * Removes morph relation data with invalid or non-existent morph types.
 *
 * This function iterates over the database metadata to identify morph relationships
 * (relations with a `joinTable` containing the specified pivot column) and removes
 * any entries in the relation's join table where the morph type is invalid:
 * - Morph types without corresponding metadata.
 * - Morph types pointing to tables that no longer exist in the database.
 *
 * Note: This function does not check for orphaned IDs, only orphaned morph types.
 *
 * @param db - The database object containing metadata and a Knex connection.
 * @param pivot - The name of the column in the join table representing the morph type.
 */
export const removeOrphanMorphTypes = async (db: Database, pivot: string) => {
  for (const model of db.metadata.values()) {
    const attributes = Object.values(model.attributes || {}).filter(
      (attribute) =>
        attribute.type === 'relation' &&
        'joinTable' in attribute &&
        'name' in attribute.joinTable &&
        'target' in attribute &&
        'pivotColumns' in attribute.joinTable &&
        attribute.joinTable.pivotColumns.includes(pivot)
    );

    for (const attribute of attributes) {
      if (!('joinTable' in attribute)) {
        continue;
      }

      const joinTableName = attribute.joinTable.name;

      // Query distinct component types from the join table
      const morphTypes = await db.connection(joinTableName).distinct(pivot).pluck(pivot);

      for (const morphType of morphTypes) {
        let deleteComponentType = false;
        let morphMetadata;

        try {
          morphMetadata = db.metadata.get(morphType);
        } catch {
          db.logger.debug(
            `Metadata for morph type "${morphType}" in table "${joinTableName}" not found`
          );
          deleteComponentType = true;
        }

        if (!deleteComponentType && morphMetadata) {
          // Check if the tableName exists in the database
          const tableExists = await db.connection.schema.hasTable(morphMetadata.tableName);
          if (!tableExists) {
            db.logger.debug(
              `Table "${morphMetadata.tableName}" does not exist. Removing morph type "${morphType}" from table "${joinTableName}".`
            );
            deleteComponentType = true;
          }
        }

        // Delete rows where pivot column value matches invalid value
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
