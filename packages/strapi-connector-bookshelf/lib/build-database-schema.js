const _ = require('lodash');
const { singular } = require('pluralize');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

module.exports = async ({ ORM, loadedModel, definition, connection, model }) => {
  const definitionDidChange = await didDefinitionChange(definition, ORM);
  if (!definitionDidChange) {
    return;
  }
  const draftAndPublishMigrationWay = await getDraftAndPublishMigrationWay({ definition, ORM });
  if (draftAndPublishMigrationWay === 'disable') {
    await migrateDraftAndPublish({ definition, ORM, way: 'disable' });
  }

  const createAtCol = _.get(loadedModel, 'timestamps.0', 'created_at');
  const updatedAtCol = _.get(loadedModel, 'timestamps.1', 'updated_at');

  // Add created_at and updated_at field if timestamp option is true
  if (loadedModel.timestamps) {
    definition.attributes[createAtCol] = { type: 'currentTimestamp' };
    definition.attributes[updatedAtCol] = { type: 'currentTimestamp' };
  }

  // Equilize tables
  if (connection.options && connection.options.autoMigration !== false) {
    await createOrUpdateTable({
      table: loadedModel.tableName,
      attributes: definition.attributes,
      definition,
      ORM,
      model,
    });
  }

  // Equilize polymorphic relations
  const morphRelations = definition.associations.filter(association => {
    return association.nature.toLowerCase().includes('morphto');
  });

  for (const morphRelation of morphRelations) {
    const attributes = {
      [`${loadedModel.tableName}_id`]: { type: definition.primaryKeyType },
      [`${morphRelation.alias}_id`]: { type: definition.primaryKeyType },
      [`${morphRelation.alias}_type`]: { type: 'text' },
      [definition.attributes[morphRelation.alias].filter]: { type: 'text' },
      order: { type: 'integer' },
    };

    if (connection.options && connection.options.autoMigration !== false) {
      await createOrUpdateTable({
        table: `${loadedModel.tableName}_morph`,
        attributes,
        definition,
        ORM,
        model,
      });
    }
  }

  // Equilize many to many relations
  const manyRelations = definition.associations.filter(({ nature }) =>
    ['manyToMany', 'manyWay'].includes(nature)
  );

  for (const manyRelation of manyRelations) {
    const { plugin, collection, via, dominant, alias } = manyRelation;

    if (dominant) {
      const targetCollection = strapi.db.getModel(collection, plugin);

      const targetAttr = via
        ? targetCollection.attributes[via]
        : {
            attribute: singular(definition.collectionName),
            column: definition.primaryKey,
          };

      const defAttr = definition.attributes[alias];

      const targetCol = `${targetAttr.attribute}_${targetAttr.column}`;
      let rootCol = `${defAttr.attribute}_${defAttr.column}`;

      // manyWay with same CT
      if (rootCol === targetCol) {
        rootCol = `related_${rootCol}`;
      }

      const attributes = {
        [targetCol]: { type: targetCollection.primaryKeyType },
        [rootCol]: { type: definition.primaryKeyType },
      };

      const table = manyRelation.tableCollectionName;
      if (connection.options && connection.options.autoMigration !== false) {
        await createOrUpdateTable({ table, attributes, definition, ORM, model });
      }
    }
  }

  // Remove from attributes (auto handled by bookshlef and not displayed on ctb)
  if (loadedModel.timestamps) {
    delete definition.attributes[createAtCol];
    delete definition.attributes[updatedAtCol];
  }

  if (draftAndPublishMigrationWay === 'enable') {
    await migrateDraftAndPublish({ definition, ORM, way: 'enable' });
  }

  await storeDefinition(definition, ORM);
};

const isColumn = ({ definition, attribute, name }) => {
  if (!_.has(attribute, 'type')) {
    const relation = definition.associations.find(association => {
      return association.alias === name;
    });

    if (!relation) return false;

    if (['oneToOne', 'manyToOne', 'oneWay'].includes(relation.nature)) {
      return true;
    }

    return false;
  }

  if (['component', 'dynamiczone'].includes(attribute.type)) {
    return false;
  }

  return true;
};

const formatDefinitionToStore = definition =>
  JSON.stringify(
    _.pick(definition, ['uid', 'collectionName', 'kind', 'info', 'options', 'attributes'])
  );

const getDefinitionFromStore = async (definition, ORM) => {
  const coreStoreExists = await ORM.knex.schema.hasTable('core_store');

  if (!coreStoreExists) {
    return undefined;
  }

  const def = await strapi.models['core_store']
    .forge({ key: `model_def_${definition.uid}` })
    .fetch();

  return def ? def.toJSON() : undefined;
};

const didDefinitionChange = async (definition, ORM) => {
  const previousDefRow = await getDefinitionFromStore(definition, ORM);
  const previousDefJSON = _.get(previousDefRow, 'value', null);
  const actualDefJSON = formatDefinitionToStore(definition);

  return previousDefJSON !== actualDefJSON;
};

const getDraftAndPublishMigrationWay = async ({ definition, ORM }) => {
  const previousDefRow = await getDefinitionFromStore(definition, ORM);
  const previousDef = JSON.parse(_.get(previousDefRow, 'value', null));
  const previousDraftAndPublish = _.get(previousDef, 'options.draftAndPublish', false) === true;
  const actualDraftAndPublish = _.get(definition, 'options.draftAndPublish', false) === true;

  if (previousDraftAndPublish === actualDraftAndPublish) {
    return 'none';
  }
  if (!previousDraftAndPublish && actualDraftAndPublish) {
    return 'enable';
  }
  if (previousDraftAndPublish && !actualDraftAndPublish) {
    return 'disable';
  }
};

const migrateDraftAndPublish = async ({ definition, ORM, way }) => {
  if (way === 'enable') {
    await ORM.knex(definition.collectionName)
      .update({ [PUBLISHED_AT_ATTRIBUTE]: new Date().toISOString() })
      .where(PUBLISHED_AT_ATTRIBUTE, null);
  } else if (way === 'disable') {
    const query = ORM.knex(definition.collectionName)
      .delete()
      .where(PUBLISHED_AT_ATTRIBUTE, null);
    await query;
  }
};

const storeDefinition = async (definition, ORM) => {
  const defToStore = formatDefinitionToStore(definition);
  const existingDef = await getDefinitionFromStore(definition, ORM);

  await strapi.models['core_store']
    .forge({
      id: existingDef ? existingDef.id : undefined,
      key: `model_def_${definition.uid}`,
      type: 'object',
      value: defToStore,
    })
    .save();
};

const uniqueColName = (table, key) => `${table}_${key}_unique`;

const buildColType = ({ name, attribute, table, tableExists = false, definition, ORM }) => {
  if (!attribute.type) {
    const relation = definition.associations.find(association => association.alias === name);

    if (['oneToOne', 'manyToOne', 'oneWay'].includes(relation.nature)) {
      return buildColType({
        name,
        attribute: { type: definition.primaryKeyType },
        table,
        tableExists,
        definition,
        ORM,
      });
    }

    return null;
  }

  // allow custom data type for a column
  if (_.has(attribute, 'columnType')) {
    return table.specificType(name, attribute.columnType);
  }

  switch (attribute.type) {
    case 'uuid':
      return table.uuid(name);
    case 'uid': {
      table.unique(name);
      return table.string(name);
    }
    case 'richtext':
    case 'text':
      return table.text(name, 'longtext');
    case 'json':
      return definition.client === 'pg' ? table.jsonb(name) : table.text(name, 'longtext');
    case 'enumeration':
    case 'string':
    case 'password':
    case 'email':
      return table.string(name);
    case 'integer':
      return table.integer(name);
    case 'biginteger':
      return table.bigInteger(name);
    case 'float':
      return table.double(name);
    case 'decimal':
      return table.decimal(name, 10, 2);
    case 'date':
      return table.date(name);
    case 'time':
      return table.time(name, 3);
    case 'datetime':
      return table.datetime(name);
    case 'timestamp':
      return table.timestamp(name);
    case 'currentTimestamp': {
      const col = table.timestamp(name);

      if (definition.client !== 'sqlite3' && tableExists) {
        return col;
      }

      return col.defaultTo(ORM.knex.fn.now());
    }
    case 'boolean':
      return table.boolean(name);
    default:
      return null;
  }
};

// Equilize database tables
const createOrUpdateTable = async ({ table, attributes, definition, ORM, model }) => {
  const tableExists = await ORM.knex.schema.hasTable(table);

  const createIdType = table => {
    if (definition.primaryKeyType === 'uuid' && definition.client === 'pg') {
      return table
        .specificType('id', 'uuid DEFAULT uuid_generate_v4()')
        .notNullable()
        .primary();
    }

    return table.increments('id');
  };

  const createColumns = (tbl, columns, opts = {}) => {
    const { tableExists, alter = false } = opts;

    Object.keys(columns).forEach(key => {
      const attribute = columns[key];

      const col = buildColType({
        name: key,
        attribute,
        table: tbl,
        tableExists,
        definition,
        ORM,
      });
      if (!col) return;

      if (attribute.required === true) {
        if (
          (definition.client !== 'sqlite3' || !tableExists) &&
          !contentTypesUtils.hasDraftAndPublish(model) && // no require constraint to allow drafts
          definition.modelType !== 'component' // no require constraint to allow components in drafts
        ) {
          col.notNullable();
        }
      } else {
        col.nullable();
      }

      if (attribute.unique === true) {
        if (definition.client !== 'sqlite3' || !tableExists) {
          tbl.unique(key, uniqueColName(table, key));
        }
      }

      if (alter) {
        col.alter();
      }
    });
  };

  const alterColumns = (tbl, columns, opts = {}) => {
    return createColumns(tbl, columns, { ...opts, alter: true });
  };

  const createTable = (table, { trx = ORM.knex, ...opts } = {}) => {
    return trx.schema.createTable(table, tbl => {
      createIdType(tbl);
      createColumns(tbl, attributes, { ...opts, tableExists: false });
    });
  };

  if (!tableExists) {
    await createTable(table);
    return;
  }

  const columns = Object.keys(attributes);

  // Fetch existing column
  const columnsExist = await Promise.all(
    columns.map(attribute => ORM.knex.schema.hasColumn(table, attribute))
  );

  const columnsToAdd = {};

  // Get columns to add
  columnsExist.forEach((columnExist, index) => {
    const attribute = attributes[columns[index]];

    if (!columnExist) {
      columnsToAdd[columns[index]] = attribute;
    }
  });

  // Generate and execute query to add missing column
  if (Object.keys(columnsToAdd).length > 0) {
    await ORM.knex.schema.table(table, tbl => {
      createColumns(tbl, columnsToAdd, { tableExists });
    });
  }

  if (definition.client === 'sqlite3') {
    const tmpTable = `tmp_${table}`;

    const rebuildTable = async trx => {
      await trx.schema.renameTable(table, tmpTable);

      // drop possible conflicting indexes
      await Promise.all(
        columns.map(key => trx.raw('DROP INDEX IF EXISTS ??', uniqueColName(table, key)))
      );

      // create the table
      await createTable(table, { trx });

      const attrs = Object.keys(attributes).filter(attribute =>
        isColumn({
          definition,
          attribute: attributes[attribute],
          name: attribute,
        })
      );

      const allAttrs = ['id', ...attrs];

      await trx.insert(qb => qb.select(allAttrs).from(tmpTable)).into(table);
      await trx.schema.dropTableIfExists(tmpTable);
    };

    try {
      await ORM.knex.transaction(trx => rebuildTable(trx));
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        strapi.log.error(
          `Unique constraint fails, make sure to update your data and restart to apply the unique constraint.\n\t- ${err.stack}`
        );
      } else {
        strapi.log.error(`Migration failed`);
        strapi.log.error(err);
      }

      return false;
    }
  } else {
    const alterTable = async trx => {
      await Promise.all(
        columns.map(col => {
          return ORM.knex.schema
            .alterTable(table, tbl => {
              tbl.dropUnique(col, uniqueColName(table, col));
            })
            .catch(() => {});
        })
      );
      await trx.schema.alterTable(table, tbl => {
        alterColumns(tbl, _.pick(attributes, columns), {
          tableExists,
        });
      });
    };

    try {
      await ORM.knex.transaction(trx => alterTable(trx));
    } catch (err) {
      if (err.code === '23505' && definition.client === 'pg') {
        strapi.log.error(
          `Unique constraint fails, make sure to update your data and restart to apply the unique constraint.\n\t- ${err.message}\n\t- ${err.detail}`
        );
      } else if (definition.client === 'mysql' && err.errno === 1062) {
        strapi.log.error(
          `Unique constraint fails, make sure to update your data and restart to apply the unique constraint.\n\t- ${err.sqlMessage}`
        );
      } else {
        strapi.log.error(`Migration failed`);
        strapi.log.error(err);
      }

      return false;
    }
  }
};
