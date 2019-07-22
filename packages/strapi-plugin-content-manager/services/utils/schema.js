'use strict';

const _ = require('lodash');

const pickSchemaFields = model => _.pick(model, []);

module.exports = {
  pickSchemaFields,
};
