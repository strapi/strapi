'use strict';

const cloneDeep = require('lodash/cloneDeep');
const { validateComponentDefinition } = require('./validator');

const createComponent = (uid, definition = {}) => {
  try {
    validateComponentDefinition(definition);
  } catch (e) {
    throw new Error(`Component Definition is invalid for ${uid}'.\n${e.errors}`);
  }

  const { schema } = cloneDeep(definition);

  return schema;
};

module.exports = {
  createComponent,
};
