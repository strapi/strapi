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

const RESERVED_TABLE_NAMES = ['strapi_migrations', 'strapi_database_schema'];

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
    const changes = [];

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
    const changes = [];

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
   * @param {Object} oldColumn - column info read from DB (dialect specific) or from previous generated schema
   * @param {Object} column - newly generate column info
   */
  const diffColumns = (oldColumn: Column, column: Column): ColumnDiff => {
    const changes = [];

    const isIgnoredType = ['increments'].includes(column.type);
    const oldType = db.dialect.getSqlType(oldColumn.type);
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

  const diffTableColumns = (srcTable: Table, destTable: Table): ColumnsDiff => {
    const addedColumns: Column[] = [];
    const updatedColumns: ColumnDiff['diff'][] = [];
    const unchangedColumns: Column[] = [];
    const removedColumns: Column[] = [];

    for (const destColumn of destTable.columns) {
      const srcColumn = helpers.findColumn(srcTable, destColumn.name);
      if (srcColumn) {
        const { status, diff } = diffColumns(srcColumn, destColumn);

        if (status === statuses.CHANGED) {
          updatedColumns.push(diff);
        } else {
          unchangedColumns.push(srcColumn);
        }
      } else {
        addedColumns.push(destColumn);
      }
    }

    for (const srcColumn of srcTable.columns) {
      if (!helpers.hasColumn(destTable, srcColumn.name)) {
        removedColumns.push(srcColumn);
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

  const diffTableIndexes = (srcTable: Table, destTable: Table): IndexesDiff => {
    const addedIndexes: Index[] = [];
    const updatedIndexes: IndexDiff['diff'][] = [];
    const unchangedIndexes: Index[] = [];
    const removedIndexes: Index[] = [];

    for (const destIndex of destTable.indexes) {
      const srcIndex = helpers.findIndex(srcTable, destIndex.name);
      if (srcIndex) {
        const { status, diff } = diffIndexes(srcIndex, destIndex);

        if (status === statuses.CHANGED) {
          updatedIndexes.push(diff);
        } else {
          unchangedIndexes.push(srcIndex);
        }
      } else {
        addedIndexes.push(destIndex);
      }
    }

    for (const srcIndex of srcTable.indexes) {
      if (!helpers.hasIndex(destTable, srcIndex.name)) {
        removedIndexes.push(srcIndex);
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

  const diffTableForeignKeys = (srcTable: Table, destTable: Table): ForeignKeysDiff => {
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

    for (const destForeignKey of destTable.foreignKeys) {
      const srcForeignKey = helpers.findForeignKey(srcTable, destForeignKey.name);
      if (srcForeignKey) {
        const { status, diff } = diffForeignKeys(srcForeignKey, destForeignKey);

        if (status === statuses.CHANGED) {
          updatedForeignKeys.push(diff);
        } else {
          unchangedForeignKeys.push(srcForeignKey);
        }
      } else {
        addedForeignKeys.push(destForeignKey);
      }
    }

    for (const srcForeignKey of srcTable.foreignKeys) {
      if (!helpers.hasForeignKey(destTable, srcForeignKey.name)) {
        removedForeignKeys.push(srcForeignKey);
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

  const diffTables = (srcTable: Table, destTable: Table): TableDiff => {
    const columnsDiff = diffTableColumns(srcTable, destTable);
    const indexesDiff = diffTableIndexes(srcTable, destTable);
    const foreignKeysDiff = diffTableForeignKeys(srcTable, destTable);

    const hasChanged = [columnsDiff, indexesDiff, foreignKeysDiff].some(hasChangedStatus);

    return {
      status: hasChanged ? statuses.CHANGED : statuses.UNCHANGED,
      diff: {
        name: srcTable.name,
        indexes: indexesDiff.diff,
        foreignKeys: foreignKeysDiff.diff,
        columns: columnsDiff.diff,
      },
    };
  };

  const diffSchemas = async (srcSchema: Schema, destSchema: Schema): Promise<SchemaDiff> => {
    const addedTables: Table[] = [];
    const updatedTables: TableDiff['diff'][] = [];
    const unchangedTables: Table[] = [];
    const removedTables = [];

    for (const destTable of destSchema.tables) {
      const srcTable = helpers.findTable(srcSchema, destTable.name);
      if (srcTable) {
        const { status, diff } = diffTables(srcTable, destTable);

        if (status === statuses.CHANGED) {
          updatedTables.push(diff);
        } else {
          unchangedTables.push(srcTable);
        }
      } else {
        addedTables.push(destTable);
      }
    }

    const parsePersistedTable = (persistedTable: string | Table) => {
      if (typeof persistedTable === 'string') {
        return persistedTable;
      }
      return persistedTable.name;
    };

    const persistedTables = helpers.hasTable(srcSchema, 'strapi_core_store_settings')
      ? (await strapi.store.get({
          type: 'core',
          key: 'persisted_tables',
        })) ?? []
      : [];

    const reservedTables = [...RESERVED_TABLE_NAMES, ...persistedTables.map(parsePersistedTable)];

    type PersistedTable = {
      name: string;
      dependsOn?: Array<{ name: string }>;
    };

    for (const srcTable of srcSchema.tables) {
      if (!helpers.hasTable(destSchema, srcTable.name) && !reservedTables.includes(srcTable.name)) {
        const dependencies = persistedTables
          .filter((table: PersistedTable) => {
            const dependsOn = table?.dependsOn;

            if (!_.isArray(dependsOn)) {
              return;
            }

            return dependsOn.some((table) => table.name === srcTable.name);
          })
          .map((dependsOnTable: PersistedTable) => {
            return srcSchema.tables.find((srcTable) => srcTable.name === dependsOnTable.name);
          })
          // In case the table is not found, filter undefined values
          .filter((table: PersistedTable) => !_.isNil(table));

        removedTables.push(srcTable, ...dependencies);
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
