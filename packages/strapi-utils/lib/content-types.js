'use strict';

const _ = require('lodash');

const ID_ATTRIBUTE = 'id';
const PUBLISHED_AT_ATTRIBUTE = 'published_at';
const CREATED_BY_ATTRIBUTE = 'created_by';
const UPDATED_BY_ATTRIBUTE = 'updated_by';
const DP_PUB_STATE_LIVE = 'live';
const DP_PUB_STATE_PREVIEW = 'preview';
const DP_PUB_STATES = [DP_PUB_STATE_LIVE, DP_PUB_STATE_PREVIEW];

const NON_WRITABLE_ATTRIBUTES = [ID_ATTRIBUTE, CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE];
const NON_VISIBLE_ATTRIBUTES = [...NON_WRITABLE_ATTRIBUTES, PUBLISHED_AT_ATTRIBUTE];

const constants = {
  ID_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
  DP_PUB_STATES,
  DP_PUB_STATE_LIVE,
  DP_PUB_STATE_PREVIEW,
};

const getTimestamps = model => {
  const timestamps = _.get(model, 'options.timestamps', []);

  if (!_.isArray(timestamps)) {
    return [];
  }

  return timestamps;
};
const getNonWritableAttributes = (model = {}) => {
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
  return _.uniq([model.primaryKey, ...getTimestamps(model), ...NON_VISIBLE_ATTRIBUTES]);
};

const getVisibleAttributes = model => {
  return _.difference(_.keys(model.attributes), getNonVisibleAttributes(model));
};

const hasDraftAndPublish = model => _.get(model, 'options.draftAndPublish', false) === true;

const isDraft = (data, model) =>
  hasDraftAndPublish(model) && _.get(data, PUBLISHED_AT_ATTRIBUTE) === null;

const getPrivateAttributes = (model = {}) => {
  return _.union(
    strapi.config.get('api.responses.privateAttributes', []),
    _.get(model, 'options.privateAttributes', []),
    _.keys(_.pickBy(model.attributes, attr => !!attr.private))
  );
};

const isPrivateAttribute = (model = {}, attributeName) => {
  return model.privateAttributes.includes(attributeName);
};

module.exports = {
  getPrivateAttributes,
  isPrivateAttribute,
  constants,
  getNonWritableAttributes,
  getNonVisibleAttributes,
  getVisibleAttributes,
  hasDraftAndPublish,
  isDraft,
};
