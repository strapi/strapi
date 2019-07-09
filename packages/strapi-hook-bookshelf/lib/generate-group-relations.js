'use strict';

const pluralize = require('pluralize');

module.exports = async ({ model, definition, ORM, GLOBALS }) => {
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
      slice() {
        return this.morphTo(
          'slice',
          ...groupAttributes.map(key => {
            const groupKey = definition.attributes[key].group;
            return GLOBALS[strapi.groups[groupKey].globalId];
          })
        );
      },
    });

    joinModel.foreignKey = joinColumn;

    groupAttributes.forEach(name => {
      model[name] = function relation() {
        return this.hasMany(joinModel).query(qb => {
          qb.where('field', name).orderBy('order');
        });
      };
      // make the joinModel accessible from the main model to create the relations
      model[name].joinModel = joinModel;
    });

    await ORM.knex.schema.createTableIfNotExists(joinTable, table => {
      table.increments();
      table.string('field').notNullable();
      table
        .integer('order')
        .unsigned()
        .notNullable();
      table.string('slice_type').notNullable();
      table
        .integer('slice_id')
        .unsigned()
        .notNullable();
      table
        .integer(joinColumn)
        .unsigned()
        .notNullable();

      table
        .foreign(joinColumn)
        .references(primaryKey)
        .inTable(collectionName)
        .onDelete('CASCADE');
    });
  }
};
