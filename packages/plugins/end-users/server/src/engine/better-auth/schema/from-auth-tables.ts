import type { BetterAuthDBSchema, DBFieldAttribute } from 'better-auth/db';

import type { EngineField, EngineTable } from '../../types';

const toEngineField = (field: DBFieldAttribute): EngineField => {
  const engineField: EngineField = { type: field.type };

  // Only what the plugin acts on is carried over: Better Auth's validators, transforms and
  // `onUpdate` hooks stay behind the boundary.
  if (field.required !== undefined) engineField.required = field.required;
  if (field.unique !== undefined) engineField.unique = field.unique;
  if (field.index !== undefined) engineField.index = field.index;
  if (field.returned !== undefined) engineField.returned = field.returned;
  if (field.sortable !== undefined) engineField.sortable = field.sortable;
  if (field.bigint !== undefined) engineField.bigint = field.bigint;
  if (field.defaultValue !== undefined) engineField.defaultValue = field.defaultValue;
  if (field.fieldName !== undefined) engineField.fieldName = field.fieldName;
  if (field.input !== undefined) engineField.input = field.input;
  if (field.references) {
    engineField.references = { model: field.references.model, field: field.references.field };
  }

  return engineField;
};

/**
 * Turns Better Auth's `getAuthTables(options)` output into the engine-neutral tables the rest of
 * the plugin works with (`AuthEngine.schema()`).
 */
export const fromAuthTables = (tables: BetterAuthDBSchema): EngineTable[] => {
  return Object.entries(tables).map(([name, table]) => {
    const engineTable: EngineTable = {
      name,
      fields: Object.fromEntries(
        Object.entries(table.fields).map(([key, field]) => [key, toEngineField(field)])
      ),
    };

    if (table.indexes) {
      engineTable.indexes = table.indexes.map((index) => ({
        fields: index.fields,
        ...(index.unique !== undefined && { unique: index.unique }),
      }));
    }

    if (table.disableMigrations !== undefined) {
      engineTable.disableMigrations = table.disableMigrations;
    }

    return engineTable;
  });
};
