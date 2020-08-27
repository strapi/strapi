'use strict';

const _ = require('lodash');

const ID_ATTRIBUTE = 'id';
const PUBLISHED_AT_ATTRIBUTE = 'published_at';
const CREATED_BY_ATTRIBUTE = 'created_by';
const UPDATED_BY_ATTRIBUTE = 'updated_by';

const HIDDEN_ATTRIBUTES = [
  ID_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
];

// making it clear hidden attributes could still be writable
const NON_WRITABLE_ATTRIBUTES = [...HIDDEN_ATTRIBUTES];

const constants = {
  ID_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
};

const getTimestamps = model => {
  const timestamps = _.get(model, 'options.timestamps', []);

  if (!_.isArray(timestamps)) {
    return [];
  }

  return timestamps;
};
const getNonWritableAttributes = model => {
  const nonWritableAttributes = _.reduce(
    model.attributes,
    (acc, attr, attrName) => (attr.writable === false ? acc.concat(attrName) : acc),
    []
  );

  return _.uniq(
    NON_WRITABLE_ATTRIBUTES.concat(model.primaryKey, getTimestamps(model), nonWritableAttributes)
  );
};

const getNonVisibleAttributes = model => {
  return _.uniq([model.primaryKey, ...getTimestamps(model), ...HIDDEN_ATTRIBUTES]);
};

const getVisibleAttributes = model => {
  return _.difference(_.keys(model.attributes), getNonVisibleAttributes(model));
};

const hasDraftAndPublish = model => _.get(model, 'options.draftAndPublish', false) === true;

const isDraft = (data, model) =>
  hasDraftAndPublish(model) && _.get(data, PUBLISHED_AT_ATTRIBUTE) === null;

module.exports = {
  constants,
  getNonWritableAttributes,
  getVisibleAttributes,
  hasDraftAndPublish,
  isDraft,
};
