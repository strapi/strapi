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

  const { schema } = cloneDeep(definition);

  return Object.assign(schema, {
    uid,
    modelType: 'component',
    modelName: schema.info.singularName,
    category: schema.info.category,
    globalId: schema.globalId || upperFirst(camelCase(`component_${uid}`)),
  });
};

module.exports = {
  createComponent,
};
