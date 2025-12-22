/**
 * Schema diff enhancer to inject renamed columns
 * 
 * This module enhances the schema diff to include column renames
 * before it's applied to the database.
 */

import type { SchemaDiff } from '@strapi/database/dist/schema/types';

interface RenamedField {
  from: string;
  to: string;
}

/**
 * Enhance schema diff with renamed columns from content type metadata
 * 
 * @param schemaDiff - The schema diff to enhance
 * @param contentTypes - Map of content types with metadata
 * @returns Enhanced schema diff with renamed columns
 */
export const injectRenamedFieldsIntoSchemaDiff = (
  schemaDiff: SchemaDiff,
  contentTypes: Map<string, any>
): SchemaDiff => {
  const enhancedDiff = { ...schemaDiff };

  if (!enhancedDiff.diff?.tables?.updated) {
    return schemaDiff;
  }

  // Iterate through updated tables
  enhancedDiff.diff.tables.updated = enhancedDiff.diff.tables.updated.map((tableDiff) => {
    const tableName = tableDiff.name;

    // Find content type with matching table name
    let renamedFields: RenamedField[] = [];
    
    for (const [, contentType] of contentTypes) {
      if (contentType.metadata?.renamedFields && contentType.collectionName === tableName) {
        renamedFields = contentType.metadata.renamedFields;
        break;
      }
    }

    if (renamedFields.length === 0) {
      return tableDiff;
    }

    // Filter out renamed fields from added/removed columns
    const renamedFromNames = new Set(renamedFields.map((r) => r.from));
    const renamedToNames = new Set(renamedFields.map((r) => r.to));

    return {
      ...tableDiff,
      columns: {
        ...tableDiff.columns,
        added: tableDiff.columns.added.filter((col) => !renamedToNames.has(col.name)),
        removed: tableDiff.columns.removed.filter((col) => !renamedFromNames.has(col.name)),
        renamed: renamedFields,
      },
    };
  });

  return enhancedDiff;
};

/**
 * Clear renamed fields metadata after successful migration
 * 
 * @param contentTypes - Map of content types
 */
export const clearRenamedFieldsMetadata = (contentTypes: Map<string, any>): void => {
  for (const [, contentType] of contentTypes) {
    if (contentType.metadata?.renamedFields) {
      delete contentType.metadata.renamedFields;
    }
  }
};
