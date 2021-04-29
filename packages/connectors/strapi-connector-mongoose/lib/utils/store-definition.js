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

// Using MongoDB instead of Mongoose since this function
// may be called before the model 'core_store' is instanciated
const getDefinitionFromStore = async (definition, ORM) => {
  const rawDefinition = await ORM.connection.db
    .collection('core_store')
    .findOne({ key: getKeyForDefinition(definition) });

  return JSON.parse(_.get(rawDefinition, 'value', null));
};

// Using MongoDB instead of Mongoose since this function
// may be called before the model 'core_store' is instanciated
const storeDefinition = async (definition, ORM) => {
  const defToStore = formatDefinitionToStore(definition);

  await ORM.connection.db.collection('core_store').updateOne(
    {
      key: getKeyForDefinition(definition),
    },
    {
      $set: {
        key: getKeyForDefinition(definition),
        type: 'object',
        value: defToStore,
        environment: '',
        tag: '',
      },
    },
    {
      upsert: true,
    }
  );
};

const didDefinitionChange = async (definition, ORM) => {
  const previousDefJSON = await getDefinitionFromStore(definition, ORM);

  const previousDef = formatDefinitionToStore(previousDefJSON);
  const actualDef = formatDefinitionToStore(definition);

  return previousDef !== actualDef;
};

module.exports = {
  didDefinitionChange,
  storeDefinition,
  getDefinitionFromStore,
};
