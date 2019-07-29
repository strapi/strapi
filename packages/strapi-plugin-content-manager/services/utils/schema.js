'use strict';

const _ = require('lodash');

const pickSchemaFields = model =>
  _.pick(model, [
    'modelType',
    'connection',
    'collectionName',
    'info',
    'options',
    'attributes',
  ]);

module.exports = {
  pickSchemaFields,
};
