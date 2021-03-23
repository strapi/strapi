'use strict';

const _ = require('lodash');

const formatDefinitionToStore = definition =>
  JSON.stringify(
    _.pick(definition, ['uid', 'collectionName', 'kind', 'info', 'options', 'attributes'])
  );

// Using MongoDB instead of Mongoose since this function
// may be called before the model 'core_store' is instanciated
const getDefinitionFromStore = async (definition, ORM) => {
  const rawDefinition = await ORM.connection.db
    .collection('core_store')
    .findOne({ key: `model_def_${definition.uid}` });

  return JSON.parse(_.get(rawDefinition, 'value', null));
};

// Using MongoDB instead of Mongoose since this function
// may be called before the model 'core_store' is instanciated
const storeDefinition = async (definition, ORM) => {
  const defToStore = formatDefinitionToStore(definition);

  await ORM.connection.db.collection('core_store').updateOne(
    {
      key: `model_def_${definition.uid}`,
    },
    {
      $set: {
        key: `model_def_${definition.uid}`,
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
