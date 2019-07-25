'use strict';

const _ = require('lodash');

const NON_SORTABLES = ['group', 'json', 'relation'];

const isListable = (schema, name) =>
  isSortable(schema, name) && schema.attributes[name].type != 'password';

const isSortable = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  const attribute = schema.attributes[name];
  if (NON_SORTABLES.includes(attribute.type)) {
    return false;
  }

  return true;
};

const isSearchable = (schema, name) => {
  return isSortable(schema, name);
};

const isVisible = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (isTimestamp(schema, name) || name === 'id') {
    return false;
  }

  return true;
};

const isTimestamp = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  const timestampsOpt = _.get(schema, ['options', 'timestamps']);
  if (!timestampsOpt || !Array.isArray(timestampsOpt)) {
    return false;
  }

  if (timestampsOpt.includes(name)) {
    return true;
  }
};

const isRelation = attribute => attribute.type === 'relation';

const hasRelationAttribute = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  return isRelation(schema.attributes[name]);
};

const hasEditableAttribute = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (!isVisible(schema, name)) {
    return false;
  }

  if (isRelation(schema.attributes[name])) {
    if (schema.modelType === 'group') return true;
    return false;
  }

  return true;
};

module.exports = {
  isSortable,
  isVisible,
  isSearchable,
  isRelation,
  isListable,
  hasEditableAttribute,
  hasRelationAttribute,
};
