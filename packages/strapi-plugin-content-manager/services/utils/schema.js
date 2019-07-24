'use strict';

const _ = require('lodash');

const pickSchemaFields = model =>
  _.pick(model, [
    'connection',
    'collectionName',
    'info',
    'options',
    'attributes',
  ]);

module.exports = {
  pickSchemaFields,
};
