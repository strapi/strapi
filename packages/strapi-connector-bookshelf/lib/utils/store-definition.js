'use strict';

const _ = require('lodash');
const { getManyRelations } = require('./associations');

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

const didDefinitionOrTableChange = async (definition, ORM) => {
  // Checks if the tables exist in DB
  const manyRelations = getManyRelations(definition);
  const tablesToCheck = manyRelations.map(r => r.tableCollectionName);
  tablesToCheck.push(definition.collectionName);

  for (const tableToCheck of tablesToCheck) {
    const tableExists = await ORM.knex.schema.hasTable(tableToCheck);
    if (!tableExists) {
      return true;
    }
  }

  // Checks if the definition has changed
  const previousDefRow = await getDefinitionFromStore(definition, ORM);
  const previousDefJSON = _.get(previousDefRow, 'value', null);
  const actualDefJSON = formatDefinitionToStore(definition);

  return previousDefJSON !== actualDefJSON;
};

module.exports = {
  storeDefinition,
  didDefinitionOrTableChange,
  getDefinitionFromStore,
};
