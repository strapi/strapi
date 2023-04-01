'use strict';

const upperFirst = require('lodash/upperFirst');
const cloneDeep = require('lodash/cloneDeep');
const camelCase = require('lodash/camelCase');
const startCase = require('lodash/startCase');
const { validateComponentDefinition } = require('./validator');

/** @param {string} uid */
function getCategoryFromUid(uid) {
  let category = uid;
  if (category.includes('::')) {
    category = category.split('::')[1];
  }
  if (category.includes('.')) {
    category = category.split('.')[0];
  }
  return startCase(category);
}

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
    category: getCategoryFromUid(uid),
    globalId: schema.globalId || upperFirst(camelCase(`component_${uid}`)),
  });
};

module.exports = {
  createComponent,
};
