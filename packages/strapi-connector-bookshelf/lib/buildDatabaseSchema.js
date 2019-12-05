const _ = require('lodash');
const { singular } = require('pluralize');

/* global StrapiConfigs */
module.exports = async ({
  ORM,
  loadedModel,
  definition,
  connection,
  model,
}) => {
  const createIdType = (table, definition) => {
    if (definition.primaryKeyType === 'uuid' && definition.client === 'pg') {
      return table
        .specificType('id', 'uuid DEFAULT uuid_generate_v4()')
        .notNullable()
        .primary();
    }

    if (definition.primaryKeyType !== 'integer') {
      const col = buildColType({
        name: 'id',
        table,
        definition,
        attribute: {
          type: definition.primaryKeyType,
        },
      });

      if (!col) throw new Error('Invalid primaryKeyType');

      return col.notNullable().primary();
    }

    return table.increments('id');
  };

  const buildColType = ({ name, attribute, table }) => {
    if (!attribute.type) {
      const relation = definition.associations.find(association => {
        return association.alias === name;
      });

      if (['oneToOne', 'manyToOne', 'oneWay'].includes(relation.nature)) {
        return buildColType({
          name,
          attribute: { type: definition.primaryKeyType },
          table,
        });
      }

      return null;
    }

    // allo custom data type for a column
    if (_.has(attribute, 'columnType')) {
      return table.specificType(name, attribute.columnType);
    }

    switch (attribute.type) {
      case 'uuid':
        return table.uuid(name);
      case 'richtext':
      case 'text':
        return table.text(name, 'longtext');
      case 'json':
        // return client === 'pg' ? 'jsonb' : 'longtext';
        return table.jsonb(name);
      case 'enumeration':
        return table.enu(name, attribute.enum || []);
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
        return table.time(name);
      case 'datetime':
        return table.datetime(name);
      case 'timestamp':
        return table.timestamp(name);
      case 'currentTimestamp':
        return table.timestamp(name).defaultTo(ORM.knex.fn.now());
      case 'boolean':
        return table.boolean(name);
      default:
        return null;
    }
  };

  const { hasTimestamps } = loadedModel;

  let [createAtCol, updatedAtCol] = ['created_at', 'updated_at'];
  if (Array.isArray(hasTimestamps)) {
    [createAtCol, updatedAtCol] = hasTimestamps;
  }

  // Equilize database tables
  const createOrUpdateTable = async (table, attributes) => {
    const tableExists = await ORM.knex.schema.hasTable(table);

    const generateIndexes = async table => {
      try {
        const connection = strapi.config.connections[definition.connection];
        let columns = Object.keys(attributes).filter(attribute =>
          ['string', 'text'].includes(attributes[attribute].type)
        );

        if (!columns.length) {
          // No text columns founds, exit from creating Fulltext Index
          return;
        }

        switch (connection.settings.client) {
          case 'mysql':
            columns = columns.map(attribute => `\`${attribute}\``).join(',');

            // Create fulltext indexes for every column.
            await ORM.knex.raw(
              `CREATE FULLTEXT INDEX SEARCH_${_.toUpper(
                _.snakeCase(table)
              )} ON \`${table}\` (${columns})`
            );
            break;
          case 'pg': {
            // Enable extension to allow GIN indexes.
            await ORM.knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

            // Create GIN indexes for every column.
            const indexes = columns.map(column => {
              const indexName = `${_.snakeCase(table)}_${column}`;
              const attribute =
                _.toLower(column) === column ? column : `"${column}"`;

              return ORM.knex.raw(
                `CREATE INDEX IF NOT EXISTS search_${_.toLower(
                  indexName
                )} ON "${table}" USING gin(${attribute} gin_trgm_ops)`
              );
            });

            await Promise.all(indexes);
            break;
          }
        }
      } catch (e) {
        // Handle duplicate errors.
        if (e.errno !== 1061 && e.code !== '42P07') {
          if (_.get(connection, 'options.debug') === true) {
            console.log(e);
          }

          strapi.log.warn(
            `The SQL database indexes haven't been generated successfully. Please enable the debug mode for more details.`
          );
        }
      }
    };

    const buildColumns = (tbl, columns, opts = {}) => {
      const { tableExists, alter = false } = opts;

      Object.keys(columns).forEach(key => {
        const attribute = columns[key];

        const col = buildColType({ name: key, attribute, table: tbl });
        if (!col) return;

        if (attribute.required === true) {
          if (definition.client !== 'sqlite3' || !tableExists) {
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

    const createColumns = (tbl, columns, opts = {}) => {
      return buildColumns(tbl, columns, opts);
    };

    const alterColumns = (tbl, columns, opts = {}) => {
      return createColumns(tbl, columns, { ...opts, alter: true });
    };

    const createTable = (table, { trx = ORM.knex, ...opts } = {}) => {
      return trx.schema.createTable(table, tbl => {
        createIdType(tbl, definition);
        createColumns(tbl, attributes, { ...opts, tableExists: false });
      });
    };

    if (!tableExists) {
      await createTable(table);
      await generateIndexes(table);
      await storeTable(table, attributes);
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

    // Generate indexes for new attributes.
    await generateIndexes(table, columnsToAdd);

    let previousAttributes;
    try {
      previousAttributes = JSON.parse(
        (await StrapiConfigs.forge({
          key: `db_model_${table}`,
        }).fetch()).toJSON().value
      );
    } catch (err) {
      await storeTable(table, attributes);
      previousAttributes = JSON.parse(
        (await StrapiConfigs.forge({
          key: `db_model_${table}`,
        }).fetch()).toJSON().value
      );
    }

    if (JSON.stringify(previousAttributes) === JSON.stringify(attributes)) {
      return;
    }

    if (definition.client === 'sqlite3') {
      const tmpTable = `tmp_${table}`;

      const rebuildTable = async trx => {
        await trx.schema.renameTable(table, tmpTable);

        // drop possible conflicting indexes
        await Promise.all(
          columns.map(key =>
            trx.raw('DROP INDEX IF EXISTS ??', uniqueColName(table, key))
          )
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

        await trx.raw(`INSERT INTO ?? (${allAttrs.join(', ')}) ??`, [
          table,
          trx.select(allAttrs).from(tmpTable),
        ]);

        await trx.schema.dropTableIfExists(tmpTable);
      };

      try {
        await ORM.knex.transaction(trx => rebuildTable(trx));
        await generateIndexes(table);
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
      const columnsToAlter = columns.filter(
        key =>
          JSON.stringify(previousAttributes[key]) !==
          JSON.stringify(attributes[key])
      );

      const alterTable = async trx => {
        await Promise.all(
          columnsToAlter.map(col => {
            return ORM.knex.schema
              .alterTable(table, tbl => {
                tbl.dropUnique(col, uniqueColName(table, col));
              })
              .catch(() => {});
          })
        );
        await trx.schema.alterTable(table, tbl => {
          alterColumns(tbl, _.pick(attributes, columnsToAlter), {
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

    await storeTable(table, attributes);
  };

  // Add created_at and updated_at field if timestamp option is true
  if (hasTimestamps) {
    definition.attributes[createAtCol] = {
      type: 'currentTimestamp',
    };
    definition.attributes[updatedAtCol] = {
      type: 'currentTimestamp',
    };
  }

  // Save all attributes (with timestamps) and right type
  model.allAttributes = _.assign(_.clone(definition.attributes), {
    [createAtCol]: {
      type: 'timestamp',
    },
    [updatedAtCol]: {
      type: 'timestamp',
    },
  });

  // Equilize tables
  if (connection.options && connection.options.autoMigration !== false) {
    await createOrUpdateTable(loadedModel.tableName, definition.attributes);
  }

  // Equilize polymorphic releations
  const morphRelations = definition.associations.filter(association => {
    return association.nature.toLowerCase().includes('morphto');
  });

  for (const morphRelation of morphRelations) {
    const attributes = {
      [`${loadedModel.tableName}_id`]: {
        type: definition.primaryKeyType,
      },
      [`${morphRelation.alias}_id`]: {
        type: definition.primaryKeyType,
      },
      [`${morphRelation.alias}_type`]: {
        type: 'text',
      },
      [definition.attributes[morphRelation.alias].filter]: {
        type: 'text',
      },
    };

    if (connection.options && connection.options.autoMigration !== false) {
      await createOrUpdateTable(`${loadedModel.tableName}_morph`, attributes);
    }
  }

  // Equilize many to many releations
  const manyRelations = definition.associations.filter(({ nature }) =>
    ['manyToMany', 'manyWay'].includes(nature)
  );

  for (const manyRelation of manyRelations) {
    const { plugin, collection, via, dominant, alias } = manyRelation;

    if (dominant) {
      const targetCollection = plugin
        ? strapi.plugins[plugin].models[collection]
        : strapi.models[collection];

      const targetAttr = via
        ? targetCollection.attributes[via]
        : {
            attribute: singular(definition.collectionName),
            column: definition.primaryKey,
          };

      const defAttr = definition.attributes[alias];

      const attributes = {
        [`${targetAttr.attribute}_${targetAttr.column}`]: {
          type: targetCollection.primaryKeyType,
        },
        [`${defAttr.attribute}_${defAttr.column}`]: {
          type: definition.primaryKeyType,
        },
      };

      const table = manyRelation.tableCollectionName;
      if (connection.options && connection.options.autoMigration !== false) {
        await createOrUpdateTable(table, attributes);
      }
    }
  }

  // Remove from attributes (auto handled by bookshlef and not displayed on ctb)
  if (hasTimestamps) {
    delete definition.attributes[createAtCol];
    delete definition.attributes[updatedAtCol];
  }
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

const storeTable = async (table, attributes) => {
  const existTable = await StrapiConfigs.forge({
    key: `db_model_${table}`,
  }).fetch();

  if (existTable) {
    return await StrapiConfigs.forge({
      id: existTable.id,
    }).save({
      value: JSON.stringify(attributes),
    });
  }

  await StrapiConfigs.forge({
    key: `db_model_${table}`,
    type: 'object',
    value: JSON.stringify(attributes),
  }).save();
};

const uniqueColName = (table, key) => `${table}_${key}_unique`;
