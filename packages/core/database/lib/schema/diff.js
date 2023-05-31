'use strict';

const _ = require('lodash/fp');

const RESERVED_TABLE_NAMES = ['strapi_migrations', 'strapi_database_schema'];

const statuses = {
  CHANGED: 'CHANGED',
  UNCHANGED: 'UNCHANGED',
};

// NOTE:We could move the schema to use maps of tables & columns instead of arrays to make it easier to diff
// => this will make the creation a bit more complicated (ordering, Object.values(tables | columns)) -> not a big pbl

const helpers = {
  hasTable(schema, tableName) {
    return schema.tables.findIndex((table) => table.name === tableName) !== -1;
  },
  findTable(schema, tableName) {
    return schema.tables.find((table) => table.name === tableName);
  },

  hasColumn(table, columnName) {
    return table.columns.findIndex((column) => column.name === columnName) !== -1;
  },
  findColumn(table, columnName) {
    return table.columns.find((column) => column.name === columnName);
  },

  hasIndex(table, columnName) {
    return table.indexes.findIndex((column) => column.name === columnName) !== -1;
  },
  findIndex(table, columnName) {
    return table.indexes.find((column) => column.name === columnName);
  },

  hasForeignKey(table, columnName) {
    return table.foreignKeys.findIndex((column) => column.name === columnName) !== -1;
  },
  findForeignKey(table, columnName) {
    return table.foreignKeys.find((column) => column.name === columnName);
  },
};

module.exports = (db) => {
  const hasChangedStatus = (diff) => diff.status === statuses.CHANGED;

  /**
   * Compares two indexes info
   * @param {Object} oldIndex - index info read from DB
   * @param {Object} index - newly generate index info
   */
  const diffIndexes = (oldIndex, index) => {
    const changes = [];

    if (!_.isEqual(oldIndex.columns, index.columns)) {
      changes.push('columns');
    }

    if (_.toLower(oldIndex.type) !== _.toLower(index.type)) {
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
  const diffForeignKeys = (oldForeignKey, foreignKey) => {
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
      if (!_.isNil(foreignKey.onDelete) && _.toUpper(oldForeignKey.onDelete) !== 'NO ACTION') {
        changes.push('onDelete');
      }
    } else if (_.toUpper(oldForeignKey.onDelete) !== _.toUpper(foreignKey.onDelete)) {
      changes.push('onDelete');
    }

    if (_.isNil(oldForeignKey.onUpdate) || _.toUpper(oldForeignKey.onUpdate) === 'NO ACTION') {
      if (!_.isNil(foreignKey.onUpdate) && _.toUpper(oldForeignKey.onUpdate) !== 'NO ACTION') {
        changes.push('onUpdate');
      }
    } else if (_.toUpper(oldForeignKey.onUpdate) !== _.toUpper(foreignKey.onUpdate)) {
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

  const diffDefault = (oldColumn, column) => {
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
  const diffColumns = (oldColumn, column) => {
    const changes = [];

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

  const diffTableColumns = (srcTable, destTable) => {
    const addedColumns = [];
    const updatedColumns = [];
    const unchangedColumns = [];
    const removedColumns = [];

    for (const destColumn of destTable.columns) {
      if (!helpers.hasColumn(srcTable, destColumn.name)) {
        addedColumns.push(destColumn);
        continue;
      }

      const srcColumn = helpers.findColumn(srcTable, destColumn.name);
      const { status, diff } = diffColumns(srcColumn, destColumn);

      if (status === statuses.CHANGED) {
        updatedColumns.push(diff);
      } else {
        unchangedColumns.push(srcColumn);
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

  const diffTableIndexes = (srcTable, destTable) => {
    const addedIndexes = [];
    const updatedIndexes = [];
    const unchangedIndexes = [];
    const removedIndexes = [];

    for (const destIndex of destTable.indexes) {
      if (helpers.hasIndex(srcTable, destIndex.name)) {
        const srcIndex = helpers.findIndex(srcTable, destIndex.name);
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

  const diffTableForeignKeys = (srcTable, destTable) => {
    const addedForeignKeys = [];
    const updatedForeignKeys = [];
    const unchangedForeignKeys = [];
    const removedForeignKeys = [];

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
      if (helpers.hasForeignKey(srcTable, destForeignKey.name)) {
        const srcForeignKey = helpers.findForeignKey(srcTable, destForeignKey.name);
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

  const diffTables = (srcTable, destTable) => {
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

  const diffSchemas = async (srcSchema, destSchema) => {
    const addedTables = [];
    const updatedTables = [];
    const unchangedTables = [];
    const removedTables = [];

    for (const destTable of destSchema.tables) {
      if (helpers.hasTable(srcSchema, destTable.name)) {
        const srcTable = helpers.findTable(srcSchema, destTable.name);

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

    const parsePersistedTable = (persistedTable) => {
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

    for (const srcTable of srcSchema.tables) {
      if (!helpers.hasTable(destSchema, srcTable.name) && !reservedTables.includes(srcTable.name)) {
        const dependencies = persistedTables
          .filter((table) => {
            const dependsOn = table?.dependsOn;
            if (_.isNil(dependsOn)) return;
            // FIXME: The array parse should not be necessary
            return _.toArray(dependsOn).some((table) => table.name === srcTable.name);
          })
          .map((dependsOnTable) => {
            return srcSchema.tables.find((srcTable) => srcTable.name === dependsOnTable.name);
          });

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
