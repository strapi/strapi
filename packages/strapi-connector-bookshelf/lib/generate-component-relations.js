'use strict';

const pluralize = require('pluralize');

const { getComponentAttributes } = require('./utils/attributes');

const createComponentModels = async ({ model, definition, ORM, GLOBALS }) => {
  const { collectionName, primaryKey } = definition;

  const componentAttributes = getComponentAttributes(definition);

  if (componentAttributes.length > 0) {
    // create component model
    const joinTable = `${collectionName}_components`;
    const joinColumn = `${pluralize.singular(collectionName)}_${primaryKey}`;

    const relatedComponents = componentAttributes
      .map(key => {
        const attr = definition.attributes[key];
        const { type } = attr;

        switch (type) {
          case 'component': {
            const { component } = attr;
            return strapi.components[component];
          }
          case 'dynamiczone': {
            const { components } = attr;
            return components.map(component => strapi.components[component]);
          }
          default: {
            throw new Error(`Invalid type for attribute ${key}: ${type}`);
          }
        }
      })
      .reduce((acc, arr) => acc.concat(arr), []);

    const joinModel = ORM.Model.extend({
      requireFetch: false,
      tableName: joinTable,
      component() {
        return this.morphTo(
          'component',
          ...relatedComponents.map(component => GLOBALS[component.globalId])
        );
      },
    });

    joinModel.foreignKey = joinColumn;
    definition.componentsJoinModel = joinModel;

    componentAttributes.forEach(name => {
      model[name] = function relation() {
        return this.hasMany(joinModel, joinColumn).query(qb => {
          qb.where('field', name)
            .whereIn(
              'component_type',
              relatedComponents.map(component => component.collectionName)
            )
            .orderBy('order');
        });
      };
    });
  }
};

const createComponentJoinTables = async ({ definition, ORM }) => {
  const { collectionName, primaryKey } = definition;

  const componentAttributes = getComponentAttributes(definition);

  if (componentAttributes.length > 0) {
    const joinTable = `${collectionName}_components`;
    const joinColumn = `${pluralize.singular(collectionName)}_${primaryKey}`;

    if (await ORM.knex.schema.hasTable(joinTable)) return;

    await ORM.knex.schema.createTable(joinTable, table => {
      table.increments();
      table.string('field').notNullable();
      table
        .integer('order')
        .unsigned()
        .notNullable();
      table.string('component_type').notNullable();
      table.integer('component_id').notNullable();
      table
        .integer(joinColumn)
        .unsigned()
        .notNullable();

      table
        .foreign(joinColumn, `${joinColumn}_fk`)
        .references(primaryKey)
        .inTable(collectionName)
        .onDelete('CASCADE');
    });
  }
};

module.exports = {
  createComponentModels,
  createComponentJoinTables,
};
