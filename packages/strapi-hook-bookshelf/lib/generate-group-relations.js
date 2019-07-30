'use strict';

const pluralize = require('pluralize');

const createGroupModels = async ({ model, definition, ORM, GLOBALS }) => {
  const { collectionName, primaryKey } = definition;

  const groupAttributes = Object.keys(definition.attributes).filter(
    key => definition.attributes[key].type === 'group'
  );

  if (groupAttributes.length > 0) {
    // create group model
    const joinTable = `${collectionName}_groups`;
    const joinColumn = `${pluralize.singular(collectionName)}_${primaryKey}`;
    const joinModel = ORM.Model.extend({
      tableName: joinTable,
      group() {
        return this.morphTo(
          'group',
          ...groupAttributes.map(key => {
            const groupKey = definition.attributes[key].group;
            return GLOBALS[strapi.groups[groupKey].globalId];
          })
        );
      },
    });

    joinModel.foreignKey = joinColumn;
    definition.groupsJoinModel = joinModel;

    groupAttributes.forEach(name => {
      model[name] = function relation() {
        return this.hasMany(joinModel).query(qb => {
          qb.where('field', name).orderBy('order');
        });
      };
    });
  }
};

const createGroupJoinTables = async ({ definition, ORM }) => {
  const { collectionName, primaryKey } = definition;

  const groupAttributes = Object.keys(definition.attributes).filter(
    key => definition.attributes[key].type === 'group'
  );

  if (groupAttributes.length > 0) {
    const joinTable = `${collectionName}_groups`;
    const joinColumn = `${pluralize.singular(collectionName)}_${primaryKey}`;

    if (await ORM.knex.schema.hasTable(joinTable)) return;

    await ORM.knex.schema.createTable(joinTable, table => {
      table.increments();
      table.string('field').notNullable();
      table
        .integer('order')
        .unsigned()
        .notNullable();
      table.string('group_type').notNullable();
      table.integer('group_id').notNullable();
      table.integer(joinColumn).notNullable();

      table
        .foreign(joinColumn)
        .references(primaryKey)
        .inTable(collectionName)
        .onDelete('CASCADE');
    });
  }
};

module.exports = {
  createGroupModels,
  createGroupJoinTables,
};
