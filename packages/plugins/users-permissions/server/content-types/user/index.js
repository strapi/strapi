'use strict';

const schema = require('./schema');
const schemaConfig = require('./schema-config');

module.exports = {
  schema: {
    ...schema,
    config: schemaConfig, // TODO: to handle differently for V4
  },
};
