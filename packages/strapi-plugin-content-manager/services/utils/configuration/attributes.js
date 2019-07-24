'use strict';

const _ = require('lodash');

const NON_SORTABLES = ['group', 'json'];
const isSortable = (model, name) => {
  if (name === 'id') return true;

  const attribute = model.allAttributes[name];
  if (!_.has(attribute, 'type')) {
    return false;
  }

  if (NON_SORTABLES.includes(attribute.type)) {
    return false;
  }

  return true;
};

// check it is in the attributes not in allAttributes
const isEditable = (model, name) => _.has(model.attributes, name);

const hasRelationAttribute = (model, attr) => {
  return (
    _.has(model.allAttributes[attr], 'model') ||
    _.has(model.allAttributes[attr], 'collection')
  );
};

const hasEditableAttribute = (model, attr) => {
  if (!_.has(model.allAttributes, attr)) {
    return false;
  }

  if (!_.has(model.allAttributes[attr], 'type')) {
    return false;
  }

  return true;
};

const hasListableAttribute = (model, attr) => {
  if (attr === 'id') return true;

  if (!_.has(model.allAttributes, attr)) {
    return false;
  }

  if (!_.has(model.allAttributes[attr], 'type')) {
    return false;
  }

  if (NON_SORTABLES.includes(model.allAttributes[attr].type)) {
    return false;
  }

  return true;
};

module.exports = {
  isSortable,
  isEditable,

  hasEditableAttribute,
  hasListableAttribute,
  hasRelationAttribute,
};
