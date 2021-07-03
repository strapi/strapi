'use strict';

const _ = require('lodash');

const getKeyForDefinition = definition => `model_def_${definition.uid}`;

const formatDefinitionToStore = definition =>
  JSON.stringify(
    _.pick(definition, [
      'uid',
      'collectionName',
      'kind',
      'info',
      'options',
      'pluginOptions',
      'attributes',
    ])
  );

const getDefinitionFromStore = async (definition, ORM) => {
  const coreStoreExists = await ORM.knex.schema.hasTable('core_store');

  if (!coreStoreExists) {
    return undefined;
  }

  const def = await strapi.models['core_store']
    .forge({ key: getKeyForDefinition(definition) })
    .fetch();

  return def ? JSON.parse(_.get(def.toJSON(), 'value', null)) : undefined;
};

const storeDefinition = async (definition, ORM) => {
  const defToStore = formatDefinitionToStore(definition);
  const existingDef = await getDefinitionFromStore(definition, ORM);

  const defData = {
    key: getKeyForDefinition(definition),
    type: 'object',
    value: defToStore,
  };

  if (existingDef) {
    return strapi.models['core_store']
      .forge()
      .where({ key: getKeyForDefinition(definition) })
      .save(defData, { method: 'update' });
  }

  return strapi.models['core_store'].forge(defData).save();
};

const getColumnsWhereDefinitionChanged = async (columnsName, definition, ORM) => {
  const previousDefinition = await getDefinitionFromStore(definition, ORM);

  return columnsName.filter(columnName => {
    const previousAttribute = _.get(previousDefinition, ['attributes', columnName], null);
    const actualAttribute = _.get(definition, ['attributes', columnName], null);

    return !_.isEqual(previousAttribute, actualAttribute);
  });
};

module.exports = {
  storeDefinition,
  getDefinitionFromStore,
  getColumnsWhereDefinitionChanged,
};
