const JSON_ATTRIBUTE_TYPES = new Set(['json', 'blocks']);

/**
 * Re-serializes JSON/blocks columns in a row before INSERT.
 *
 * mysql2 and node-pg parse JSON/JSONB columns on SELECT into JS objects; knex
 * does not re-serialize those objects on INSERT. Stringify object/array values
 * for json and blocks attributes. Values that are already strings (typical of
 * SQLite) are left unchanged.
 */
export const serializeJsonColumns = (
  row: Record<string, any>,
  meta: { attributes?: Record<string, any> } | null | undefined
): Record<string, any> => {
  if (!meta?.attributes) {
    return row;
  }

  for (const attribute of Object.values(meta.attributes) as any[]) {
    if (!JSON_ATTRIBUTE_TYPES.has(attribute.type)) {
      continue;
    }

    const columnName = attribute.columnName;
    if (!columnName || !(columnName in row)) {
      continue;
    }

    const value = row[columnName];
    if (value != null && typeof value === 'object') {
      row[columnName] = JSON.stringify(value);
    }
  }

  return row;
};
