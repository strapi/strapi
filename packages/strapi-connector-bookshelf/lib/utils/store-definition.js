'use strict';

const _ = require('lodash');

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

  return def ? JSON.parse(_.get(def.toJSON(), 'value', null)) : undefined;
};

const storeDefinition = async (definition, ORM) => {
  const defToStore = formatDefinitionToStore(definition);
  const existingDef = await getDefinitionFromStore(definition, ORM);

  const defData = {
    key: `model_def_${definition.uid}`,
    type: 'object',
    value: defToStore,
  };

  if (existingDef) {
    return strapi.models['core_store'].forge({ id: existingDef.id }).save(defData);
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
