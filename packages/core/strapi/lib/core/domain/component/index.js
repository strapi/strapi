'use strict';

const { cloneDeep, camelCase, upperFirst } = require('lodash/fp');
const { validateComponentDefinition } = require('./validator');

const createComponent = (uid, category, key, definition = {}) => {
  try {
    validateComponentDefinition(definition);
  } catch (e) {
    throw new Error(`Component Definition is invalid for component::${uid}'.\n${e.errors}`);
  }

  const createdComponent = Object.assign(definition, {
    __schema__: cloneDeep(definition),
    uid,
    category,
    modelType: 'component',
    modelName: key,
    globalId: definition.globalId || upperFirst(camelCase(`component_${uid}`)),
  });

  return createdComponent;
};

module.exports = {
  createComponent,
};
