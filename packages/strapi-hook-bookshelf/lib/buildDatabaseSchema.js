const _ = require('lodash');
const { models: utilsModels } = require('strapi-utils');

/* global StrapiConfigs */
module.exports = async ({
  ORM,
  loadedModel,
  definition,
  connection,
  model,
}) => {
  const quote = definition.client === 'pg' ? '"' : '`';

  // Equilize database tables
  const handler = async (table, attributes) => {
    const tableExists = await ORM.knex.schema.hasTable(table);

    // Apply field type of attributes definition
    const generateColumns = (attrs, start, tableExists = false) => {
      return Object.keys(attrs).reduce((acc, attr) => {
        const attribute = attributes[attr];

        const type = getType({
          definition,
          attribute,
          name: attr,
          tableExists,
        });

        if (type) {
          acc.push(
            `${quote}${attr}${quote} ${type} ${
              attribute.required ? 'NOT NULL' : ''
            }`
          );
        }

        return acc;
      }, start);
    };

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

    const createTable = async table => {
      const defaultAttributeDifinitions = {
        mysql: ['id INT AUTO_INCREMENT NOT NULL PRIMARY KEY'],
        pg: ['id SERIAL NOT NULL PRIMARY KEY'],
        sqlite3: ['id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL'],
      };

      let idAttributeBuilder = defaultAttributeDifinitions[definition.client];

      if (definition.primaryKeyType === 'uuid' && definition.client === 'pg') {
        idAttributeBuilder = [
          'id uuid NOT NULL DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY',
        ];
      } else if (definition.primaryKeyType !== 'integer') {
        const type = getType({
          definition,
          attribute: {
            type: definition.primaryKeyType,
          },
        });

        idAttributeBuilder = [`id ${type} NOT NULL PRIMARY KEY`];
      }
      const columns = generateColumns(attributes, idAttributeBuilder).join(
        ',\n\r'
      );

      // Create table
      await ORM.knex.raw(`CREATE TABLE ${quote}${table}${quote} (${columns})`);
    };

    if (!tableExists) {
      await createTable(table);
      await generateIndexes(table, attributes);
      await storeTable(table, attributes);
    } else {
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

      // Generate indexes for new attributes.
      await generateIndexes(table, columnsToAdd);

      // Generate and execute query to add missing column
      if (Object.keys(columnsToAdd).length > 0) {
        await ORM.knex.schema.table(table, tbl => {
          Object.keys(columnsToAdd).forEach(key => {
            const attribute = columnsToAdd[key];
            const type = getType({
              definition,
              attribute,
              name: key,
              tableExists,
            });

            if (type) {
              const col = tbl.specificType(key, type);
              if (attribute.required && definition.client !== 'sqlite3') {
                col.notNullable();
              }
            }
          });
        });
      }

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

      if (JSON.stringify(previousAttributes) === JSON.stringify(attributes))
        return;

      if (definition.client === 'sqlite3') {
        const tmpTable = `tmp_${table}`;
        await createTable(tmpTable);

        try {
          const attrs = Object.keys(attributes).filter(attribute =>
            getType({
              definition,
              attribute: attributes[attribute],
              name: attribute,
            })
          );

          await ORM.knex.raw(`INSERT INTO ?? (${attrs.join(', ')}) ??`, [
            tmpTable,
            ORM.knex.select(attrs).from(table),
          ]);
        } catch (err) {
          strapi.log.error('Migration failed');
          strapi.log.error(err);

          await ORM.knex.schema.dropTableIfExists(tmpTable);
          return false;
        }

        await ORM.knex.schema.dropTableIfExists(table);
        await ORM.knex.schema.renameTable(tmpTable, table);

        await generateIndexes(table, attributes);
      } else {
        await ORM.knex.schema.alterTable(table, tbl => {
          columns.forEach(key => {
            if (
              JSON.stringify(previousAttributes[key]) ===
              JSON.stringify(attributes[key])
            )
              return;

            const attribute = attributes[key];
            const type = getType({
              definition,
              attribute,
              name: key,
              tableExists,
            });

            if (type) {
              let col = tbl.specificType(key, type);
              if (attribute.required) {
                col = col.notNullable();
              }
              col.alter();
            }
          });
        });
      }

      await storeTable(table, attributes);
    }
  };

  // Add created_at and updated_at field if timestamp option is true
  if (loadedModel.hasTimestamps) {
    definition.attributes[
      _.isString(loadedModel.hasTimestamps[0])
        ? loadedModel.hasTimestamps[0]
        : 'created_at'
    ] = {
      type: 'timestamp',
    };
    definition.attributes[
      _.isString(loadedModel.hasTimestamps[1])
        ? loadedModel.hasTimestamps[1]
        : 'updated_at'
    ] = {
      type: 'timestampUpdate',
    };
  }

  // Save all attributes (with timestamps)
  model.allAttributes = _.clone(definition.attributes);

  // Equilize tables
  if (connection.options && connection.options.autoMigration !== false) {
    await handler(loadedModel.tableName, definition.attributes);
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
      await handler(`${loadedModel.tableName}_morph`, attributes);
    }
  }

  // Equilize many to many releations
  const manyRelations = definition.associations.filter(association => {
    return association.nature === 'manyToMany';
  });

  for (const manyRelation of manyRelations) {
    if (manyRelation && manyRelation.dominant) {
      const collection = manyRelation.plugin
        ? strapi.plugins[manyRelation.plugin].models[manyRelation.collection]
        : strapi.models[manyRelation.collection];

      const attributes = {
        [`${collection.attributes[manyRelation.via].attribute}_${
          collection.attributes[manyRelation.via].column
        }`]: {
          type: collection.primaryKeyType,
        },
        [`${definition.attributes[manyRelation.alias].attribute}_${
          definition.attributes[manyRelation.alias].column
        }`]: {
          type: definition.primaryKeyType,
        },
      };

      const table =
        _.get(manyRelation, 'collectionName') ||
        utilsModels.getCollectionName(
          collection.attributes[manyRelation.via],
          manyRelation
        );

      await handler(table, attributes);
    }
  }

  // Remove from attributes (auto handled by bookshlef and not displayed on ctb)
  if (loadedModel.hasTimestamps) {
    delete definition.attributes[
      _.isString(loadedModel.hasTimestamps[0])
        ? loadedModel.hasTimestamps[0]
        : 'created_at'
    ];
    delete definition.attributes[
      _.isString(loadedModel.hasTimestamps[1])
        ? loadedModel.hasTimestamps[1]
        : 'updated_at'
    ];
  }
};

const getType = ({ definition, attribute, name, tableExists = false }) => {
  const { client } = definition;

  if (!attribute.type) {
    // Add integer value if there is a relation
    const relation = definition.associations.find(association => {
      return association.alias === name;
    });

    switch (relation.nature) {
      case 'oneToOne':
      case 'manyToOne':
      case 'oneWay':
        return definition.primaryKeyType;
      default:
        return null;
    }
  }

  switch (attribute.type) {
    case 'uuid':
      return client === 'pg' ? 'uuid' : 'varchar(36)';
    case 'text':
      return client === 'pg' ? 'text' : 'longtext';
    case 'json':
      return client === 'pg' ? 'jsonb' : 'longtext';
    case 'string':
    case 'enumeration':
    case 'password':
    case 'email':
      return 'varchar(255)';
    case 'integer':
      return client === 'pg' ? 'integer' : 'int';
    case 'biginteger':
      return client === 'pg' ? 'bigint' : 'bigint(53)';
    case 'float':
      return client === 'pg' ? 'double precision' : 'double';
    case 'decimal':
      return 'decimal(10,2)';
    case 'date':
    case 'time':
    case 'datetime':
    case 'timestamp':
      if (client === 'pg') {
        return 'timestamp with time zone';
      } else if (client === 'sqlite3' && tableExists) {
        return 'timestamp DEFAULT NULL';
      }
      return 'timestamp DEFAULT CURRENT_TIMESTAMP';
    case 'timestampUpdate':
      switch (client) {
        case 'pg':
          return 'timestamp with time zone';
        case 'sqlite3':
          return 'timestamp DEFAULT CURRENT_TIMESTAMP';
        default:
          return 'timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP';
      }
    case 'boolean':
      return 'boolean';
    default:
  }
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
