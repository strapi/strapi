import _ from 'lodash/fp';
import type {
  Schema,
  Table,
  SchemaDiff,
  Index,
  ForeignKey,
  Column,
  IndexDiff,
  IndexesDiff,
  ForeignKeyDiff,
  ForeignKeysDiff,
  ColumnDiff,
  TableDiff,
  ColumnsDiff,
} from './types';
import type { Database } from '..';

type PersistedTable = {
  name: string;
  dependsOn?: Array<{ name: string }>;
};

type TableDiffContext = {
  previousTable?: Table;
  databaseTable: Table;
  userSchemaTable: Table;
};

type SchemaDiffContext = {
  previousSchema?: Schema;
  databaseSchema: Schema;
  userSchema: Schema;
};

// TODO: get that list dynamically instead
const RESERVED_TABLE_NAMES = [
  'strapi_migrations',
  'strapi_migrations_internal',
  'strapi_database_schema',
];

const statuses = {
  CHANGED: 'CHANGED',
  UNCHANGED: 'UNCHANGED',
} as const;

// NOTE:We could move the schema to use maps of tables & columns instead of arrays to make it easier to diff
// => this will make the creation a bit more complicated (ordering, Object.values(tables | columns)) -> not a big pbl

const helpers = {
  hasTable(schema: Schema, tableName: string) {
    return schema.tables.findIndex((table) => table.name === tableName) !== -1;
  },
  findTable(schema: Schema, tableName: string) {
    return schema.tables.find((table) => table.name === tableName);
  },
  hasColumn(table: Table, columnName: string) {
    return table.columns.findIndex((column) => column.name === columnName) !== -1;
  },
  findColumn(table: Table, columnName: string) {
    return table.columns.find((column) => column.name === columnName);
  },

  hasIndex(table: Table, columnName: string) {
    return table.indexes.findIndex((column) => column.name === columnName) !== -1;
  },
  findIndex(table: Table, columnName: string) {
    return table.indexes.find((column) => column.name === columnName);
  },

  hasForeignKey(table: Table, columnName: string) {
    return table.foreignKeys.findIndex((column) => column.name === columnName) !== -1;
  },
  findForeignKey(table: Table, columnName: string) {
    return table.foreignKeys.find((column) => column.name === columnName);
  },
};

export default (db: Database) => {
  const hasChangedStatus = (diff: { status: 'CHANGED' | 'UNCHANGED' }) =>
    diff.status === statuses.CHANGED;

  /**
   * Compares two indexes info
   * @param {Object} oldIndex - index info read from DB
   * @param {Object} index - newly generate index info
   */
  const diffIndexes = (oldIndex: Index, index: Index): IndexDiff => {
    const changes: string[] = [];

    if (!_.isEqual(oldIndex.columns, index.columns)) {
      changes.push('columns');
    }

    if (oldIndex.type && index.type && _.toLower(oldIndex.type) !== _.toLower(index.type)) {
      changes.push('type');
    }

    return {
      status: changes.length > 0 ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        name: index.name,
        object: index,
      },
    };
  };

  /**
   * Compares two foreign keys info
   * @param {Object} oldForeignKey - foreignKey info read from DB
   * @param {Object} foreignKey - newly generate foreignKey info
   */
  const diffForeignKeys = (oldForeignKey: ForeignKey, foreignKey: ForeignKey): ForeignKeyDiff => {
    const changes: string[] = [];

    if (_.difference(oldForeignKey.columns, foreignKey.columns).length > 0) {
      changes.push('columns');
    }

    if (_.difference(oldForeignKey.referencedColumns, foreignKey.referencedColumns).length > 0) {
      changes.push('referencedColumns');
    }

    if (oldForeignKey.referencedTable !== foreignKey.referencedTable) {
      changes.push('referencedTable');
    }

    if (_.isNil(oldForeignKey.onDelete) || _.toUpper(oldForeignKey.onDelete) === 'NO ACTION') {
      if (
        !_.isNil(foreignKey.onDelete) &&
        _.toUpper(oldForeignKey.onDelete ?? '') !== 'NO ACTION'
      ) {
        changes.push('onDelete');
      }
    } else if (_.toUpper(oldForeignKey.onDelete) !== _.toUpper(foreignKey.onDelete ?? '')) {
      changes.push('onDelete');
    }

    if (_.isNil(oldForeignKey.onUpdate) || _.toUpper(oldForeignKey.onUpdate) === 'NO ACTION') {
      if (
        !_.isNil(foreignKey.onUpdate) &&
        _.toUpper(oldForeignKey.onUpdate ?? '') !== 'NO ACTION'
      ) {
        changes.push('onUpdate');
      }
    } else if (_.toUpper(oldForeignKey.onUpdate) !== _.toUpper(foreignKey.onUpdate ?? '')) {
      changes.push('onUpdate');
    }

    return {
      status: changes.length > 0 ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        name: foreignKey.name,
        object: foreignKey,
      },
    };
  };

  const diffDefault = (oldColumn: Column, column: Column) => {
    const oldDefaultTo = oldColumn.defaultTo;
    const { defaultTo } = column;

    if (oldDefaultTo === null || _.toLower(oldDefaultTo) === 'null') {
      return _.isNil(defaultTo) || _.toLower(defaultTo) === 'null';
    }

    return (
      _.toLower(oldDefaultTo) === _.toLower(column.defaultTo) ||
      _.toLower(oldDefaultTo) === _.toLower(`'${column.defaultTo}'`)
    );
  };

  /**
   * Compares two columns info
   * @param {Object} oldColumn - column info read from DB
   * @param {Object} column - newly generate column info
   */
  const diffColumns = (oldColumn: Column, column: Column): ColumnDiff => {
    const changes: string[] = [];

    const isIgnoredType = ['increments'].includes(column.type);
    const oldType = oldColumn.type;
    const type = db.dialect.getSqlType(column.type);

    if (oldType !== type && !isIgnoredType) {
      changes.push('type');
    }

    // NOTE: compare args at some point and split them into specific properties instead

    if (oldColumn.notNullable !== column.notNullable) {
      changes.push('notNullable');
    }

    const hasSameDefault = diffDefault(oldColumn, column);
    if (!hasSameDefault) {
      changes.push('defaultTo');
    }

    if (oldColumn.unsigned !== column.unsigned && db.dialect.supportsUnsigned()) {
      changes.push('unsigned');
    }

    return {
      status: changes.length > 0 ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        name: column.name,
        object: column,
      },
    };
  };

  const diffTableColumns = (diffCtx: TableDiffContext): ColumnsDiff => {
    const { databaseTable, userSchemaTable, previousTable } = diffCtx;

    const addedColumns: Column[] = [];
    const updatedColumns: ColumnDiff['diff'][] = [];
    const unchangedColumns: Column[] = [];
    const removedColumns: Column[] = [];

    for (const userSchemaColumn of userSchemaTable.columns) {
      const databaseColumn = helpers.findColumn(databaseTable, userSchemaColumn.name);

      if (databaseColumn) {
        const { status, diff } = diffColumns(databaseColumn, userSchemaColumn);

        if (status === statuses.CHANGED) {
          updatedColumns.push(diff);
        } else {
          unchangedColumns.push(databaseColumn);
        }
      } else {
        addedColumns.push(userSchemaColumn);
      }
    }

    for (const databaseColumn of databaseTable.columns) {
      if (
        !helpers.hasColumn(userSchemaTable, databaseColumn.name) &&
        previousTable &&
        helpers.hasColumn(previousTable, databaseColumn.name)
      ) {
        removedColumns.push(databaseColumn);
      }
    }

    const hasChanged = [addedColumns, updatedColumns, removedColumns].some((arr) => arr.length > 0);

    return {
      status: hasChanged ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        added: addedColumns,
        updated: updatedColumns,
        unchanged: unchangedColumns,
        removed: removedColumns,
      },
    };
  };

  const diffTableIndexes = (diffCtx: TableDiffContext): IndexesDiff => {
    const { databaseTable, userSchemaTable, previousTable } = diffCtx;

    const addedIndexes: Index[] = [];
    const updatedIndexes: IndexDiff['diff'][] = [];
    const unchangedIndexes: Index[] = [];
    const removedIndexes: Index[] = [];

    for (const userSchemaIndex of userSchemaTable.indexes) {
      const databaseIndex = helpers.findIndex(databaseTable, userSchemaIndex.name);
      if (databaseIndex) {
        const { status, diff } = diffIndexes(databaseIndex, userSchemaIndex);

        if (status === statuses.CHANGED) {
          updatedIndexes.push(diff);
        } else {
          unchangedIndexes.push(databaseIndex);
        }
      } else {
        addedIndexes.push(userSchemaIndex);
      }
    }

    for (const databaseIndex of databaseTable.indexes) {
      if (
        !helpers.hasIndex(userSchemaTable, databaseIndex.name) &&
        previousTable &&
        helpers.hasIndex(previousTable, databaseIndex.name)
      ) {
        removedIndexes.push(databaseIndex);
      }
    }

    const hasChanged = [addedIndexes, updatedIndexes, removedIndexes].some((arr) => arr.length > 0);

    return {
      status: hasChanged ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        added: addedIndexes,
        updated: updatedIndexes,
        unchanged: unchangedIndexes,
        removed: removedIndexes,
      },
    };
  };

  const diffTableForeignKeys = (diffCtx: TableDiffContext): ForeignKeysDiff => {
    const { databaseTable, userSchemaTable, previousTable } = diffCtx;

    const addedForeignKeys: ForeignKey[] = [];
    const updatedForeignKeys: ForeignKeyDiff['diff'][] = [];
    const unchangedForeignKeys: ForeignKey[] = [];
    const removedForeignKeys: ForeignKey[] = [];

    if (!db.dialect.usesForeignKeys()) {
      return {
        status: statuses.UNCHANGED,
        diff: {
          added: addedForeignKeys,
          updated: updatedForeignKeys,
          unchanged: unchangedForeignKeys,
          removed: removedForeignKeys,
        },
      };
    }

    for (const userSchemaForeignKeys of userSchemaTable.foreignKeys) {
      const databaseForeignKeys = helpers.findForeignKey(databaseTable, userSchemaForeignKeys.name);
      if (databaseForeignKeys) {
        const { status, diff } = diffForeignKeys(databaseForeignKeys, userSchemaForeignKeys);

        if (status === statuses.CHANGED) {
          updatedForeignKeys.push(diff);
        } else {
          unchangedForeignKeys.push(databaseForeignKeys);
        }
      } else {
        addedForeignKeys.push(userSchemaForeignKeys);
      }
    }

    for (const databaseForeignKeys of databaseTable.foreignKeys) {
      if (
        !helpers.hasForeignKey(userSchemaTable, databaseForeignKeys.name) &&
        previousTable &&
        helpers.hasForeignKey(previousTable, databaseForeignKeys.name)
      ) {
        removedForeignKeys.push(databaseForeignKeys);
      }
    }

    const hasChanged = [addedForeignKeys, updatedForeignKeys, removedForeignKeys].some(
      (arr) => arr.length > 0
    );

    return {
      status: hasChanged ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        added: addedForeignKeys,
        updated: updatedForeignKeys,
        unchanged: unchangedForeignKeys,
        removed: removedForeignKeys,
      },
    };
  };

  const diffTables = (diffCtx: TableDiffContext): TableDiff => {
    const { databaseTable } = diffCtx;

    const columnsDiff = diffTableColumns(diffCtx);
    const indexesDiff = diffTableIndexes(diffCtx);
    const foreignKeysDiff = diffTableForeignKeys(diffCtx);

    const hasChanged = [columnsDiff, indexesDiff, foreignKeysDiff].some(hasChangedStatus);

    return {
      status: hasChanged ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        name: databaseTable.name,
        indexes: indexesDiff.diff,
        foreignKeys: foreignKeysDiff.diff,
        columns: columnsDiff.diff,
      },
    };
  };

  const diffSchemas = async (schemaDiffCtx: SchemaDiffContext): Promise<SchemaDiff> => {
    const { previousSchema, databaseSchema, userSchema } = schemaDiffCtx;

    const addedTables: Table[] = [];
    const updatedTables: TableDiff['diff'][] = [];
    const unchangedTables: Table[] = [];
    const removedTables: Table[] = [];

    // for each table in the user schema, check if it already exists in the database schema
    for (const userSchemaTable of userSchema.tables) {
      const databaseTable = helpers.findTable(databaseSchema, userSchemaTable.name);
      const previousTable =
        previousSchema && helpers.findTable(previousSchema, userSchemaTable.name);

      if (databaseTable) {
        const { status, diff } = diffTables({
          previousTable,
          databaseTable,
          userSchemaTable,
        });

        if (status === statuses.CHANGED) {
          updatedTables.push(diff);
        } else {
          unchangedTables.push(databaseTable);
        }
      } else {
        addedTables.push(userSchemaTable);
      }
    }

    // maintain audit logs table from EE -> CE
    const parsePersistedTable = (persistedTable: string | Table) => {
      if (typeof persistedTable === 'string') {
        return persistedTable;
      }
      return persistedTable.name;
    };

    const persistedTables = helpers.hasTable(databaseSchema, 'strapi_core_store_settings')
      ? // TODO: replace with low level db query instead
        ((await strapi.store.get({
          type: 'core',
          key: 'persisted_tables',
        })) ?? [])
      : [];

    const reservedTables = [...RESERVED_TABLE_NAMES, ...persistedTables.map(parsePersistedTable)];

    // for all tables in the database schema, check if they are not in the user schema
    for (const databaseTable of databaseSchema.tables) {
      const isInUserSchema = helpers.hasTable(userSchema, databaseTable.name);
      const wasTracked = previousSchema && helpers.hasTable(previousSchema, databaseTable.name);
      const isReserved = reservedTables.includes(databaseTable.name);

      // NOTE: if db table is not in the user schema and is not in the previous stored schema leave it alone. it is a user custom table that we should not touch
      if (!isInUserSchema && !wasTracked) {
        continue;
      }

      // if a db table is not in the user schema I want to delete it
      if (!isInUserSchema && wasTracked && !isReserved) {
        const dependencies = persistedTables
          .filter((table: PersistedTable) => {
            const dependsOn = table?.dependsOn;

            if (!_.isArray(dependsOn)) {
              return;
            }

            return dependsOn.some((table) => table.name === databaseTable.name);
          })
          .map((dependsOnTable: PersistedTable) => {
            return databaseSchema.tables.find(
              (databaseTable) => databaseTable.name === dependsOnTable.name
            );
          })
          // In case the table is not found, filter undefined values
          .filter((table: PersistedTable) => !_.isNil(table));

        removedTables.push(databaseTable, ...dependencies);
      }
    }

    const hasChanged = [addedTables, updatedTables, removedTables].some((arr) => arr.length > 0);

    return {
      status: hasChanged ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        tables: {
          added: addedTables,
          updated: updatedTables,
          unchanged: unchangedTables,
          removed: removedTables,
        },
      },
    };
  };

  return {
    diff: diffSchemas,
  };
};
