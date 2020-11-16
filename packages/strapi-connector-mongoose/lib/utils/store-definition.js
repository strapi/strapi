'use strict';

const _ = require('lodash');

const formatDefinitionToStore = definition =>
  JSON.stringify(
    _.pick(definition, ['uid', 'collectionName', 'kind', 'info', 'options', 'attributes'])
  );

// Using MongoDB instead of Mongoose since this function
// may be called before the model 'core_store' is instanciated
const getDefinitionFromStore = async (definition, ORM) =>
  ORM.connection.db.collection('core_store').findOne({ key: `model_def_${definition.uid}` });

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
  const previousDefRow = await getDefinitionFromStore(definition, ORM);
  const previousDefJSON = _.get(previousDefRow, 'value', null);
  const actualDefJSON = formatDefinitionToStore(definition);

  return previousDefJSON !== actualDefJSON;
};

module.exports = {
  didDefinitionChange,
  storeDefinition,
  getDefinitionFromStore,
};
