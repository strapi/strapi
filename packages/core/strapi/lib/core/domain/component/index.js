'use strict';

const upperFirst = require('lodash/upperFirst');
const cloneDeep = require('lodash/cloneDeep');
const camelCase = require('lodash/camelCase');
const { validateComponentDefinition } = require('./validator');

const createComponent = (uid, definition = {}) => {
  try {
    validateComponentDefinition(definition);
  } catch (e) {
    throw new Error(`Component Definition is invalid for ${uid}'.\n${e.errors}`);
  }

  const createdComponent = cloneDeep(definition);
  const category = camelCase(createdComponent.schema.info.category);

  Object.assign(createdComponent.schema, {
    __schema__: cloneDeep(createdComponent.schema),
    uid,
    category,
    modelType: 'component',
    modelName: createdComponent.schema.info.singularName,
    globalId: createdComponent.schema.globalId || upperFirst(camelCase(`component_${uid}`)),
  });

  return createdComponent.schema;
};

module.exports = {
  createComponent,
};
