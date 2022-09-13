'use strict';

const _ = require('lodash');
const { has } = require('lodash/fp');

const SINGLE_TYPE = 'singleType';
const COLLECTION_TYPE = 'collectionType';

const ID_ATTRIBUTE = 'id';
const PUBLISHED_AT_ATTRIBUTE = 'publishedAt';
const CREATED_BY_ATTRIBUTE = 'createdBy';
const UPDATED_BY_ATTRIBUTE = 'updatedBy';

const CREATED_AT_ATTRIBUTE = 'createdAt';
const UPDATED_AT_ATTRIBUTE = 'updatedAt';

const DP_PUB_STATE_LIVE = 'live';
const DP_PUB_STATE_PREVIEW = 'preview';
const DP_PUB_STATES = [DP_PUB_STATE_LIVE, DP_PUB_STATE_PREVIEW];

const constants = {
  ID_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  DP_PUB_STATES,
  DP_PUB_STATE_LIVE,
  DP_PUB_STATE_PREVIEW,
  SINGLE_TYPE,
  COLLECTION_TYPE,
};

const getTimestamps = (model) => {
  const attributes = [];

  if (has(CREATED_AT_ATTRIBUTE, model.attributes)) {
    attributes.push(CREATED_AT_ATTRIBUTE);
  }

  if (has(UPDATED_AT_ATTRIBUTE, model.attributes)) {
    attributes.push(UPDATED_AT_ATTRIBUTE);
  }

  return attributes;
};

const getNonWritableAttributes = (model = {}) => {
  const nonWritableAttributes = _.reduce(
    model.attributes,
    (acc, attr, attrName) => (attr.writable === false ? acc.concat(attrName) : acc),
    []
  );

  return _.uniq([ID_ATTRIBUTE, ...getTimestamps(model), ...nonWritableAttributes]);
};

const getWritableAttributes = (model = {}) => {
  return _.difference(Object.keys(model.attributes), getNonWritableAttributes(model));
};

const isWritableAttribute = (model, attributeName) => {
  return getWritableAttributes(model).includes(attributeName);
};

const getNonVisibleAttributes = (model) => {
  const nonVisibleAttributes = _.reduce(
    model.attributes,
    (acc, attr, attrName) => (attr.visible === false ? acc.concat(attrName) : acc),
    []
  );

  return _.uniq([ID_ATTRIBUTE, ...getTimestamps(model), ...nonVisibleAttributes]);
};

const getVisibleAttributes = (model) => {
  return _.difference(_.keys(model.attributes), getNonVisibleAttributes(model));
};

const isVisibleAttribute = (model, attributeName) => {
  return getVisibleAttributes(model).includes(attributeName);
};

const hasDraftAndPublish = (model) => _.get(model, 'options.draftAndPublish', false) === true;

const isDraft = (data, model) =>
  hasDraftAndPublish(model) && _.get(data, PUBLISHED_AT_ATTRIBUTE) === null;

const isSingleType = ({ kind = COLLECTION_TYPE }) => kind === SINGLE_TYPE;
const isCollectionType = ({ kind = COLLECTION_TYPE }) => kind === COLLECTION_TYPE;
const isKind = (kind) => (model) => model.kind === kind;

const getPrivateAttributes = (model = {}) => {
  return _.union(
    strapi.config.get('api.responses.privateAttributes', []),
    _.get(model, 'options.privateAttributes', []),
    _.keys(_.pickBy(model.attributes, (attr) => !!attr.private))
  );
};

const isPrivateAttribute = (model = {}, attributeName) => {
  return model && model.privateAttributes && model.privateAttributes.includes(attributeName);
};

const isScalarAttribute = (attribute) => {
  return !['media', 'component', 'relation', 'dynamiczone'].includes(attribute.type);
};

const getScalarAttributes = (schema) => {
  return _.reduce(
    schema.attributes,
    (acc, attr, attrName) => {
      if (isScalarAttribute(attr)) acc.push(attrName);
      return acc;
    },
    []
  );
};

const isMediaAttribute = (attribute) => attribute.type === 'media';
const isRelationalAttribute = (attribute) => attribute.type === 'relation';
const isComponentAttribute = (attribute) => ['component', 'dynamiczone'].includes(attribute.type);

/**
 * Checks if an attribute is of type `type`
 * @param {object} attribute
 * @param {string} type
 */
const isTypedAttribute = (attribute, type) => {
  return _.has(attribute, 'type') && attribute.type === type;
};

/**
 *  Returns a route prefix for a contentType
 * @param {object} contentType
 * @returns {string}
 */
const getContentTypeRoutePrefix = (contentType) => {
  return isSingleType(contentType)
    ? _.kebabCase(contentType.info.singularName)
    : _.kebabCase(contentType.info.pluralName);
};

module.exports = {
  isScalarAttribute,
  isMediaAttribute,
  isRelationalAttribute,
  isComponentAttribute,
  isTypedAttribute,
  getPrivateAttributes,
  isPrivateAttribute,
  constants,
  getNonWritableAttributes,
  getScalarAttributes,
  getWritableAttributes,
  isWritableAttribute,
  getNonVisibleAttributes,
  getVisibleAttributes,
  getTimestamps,
  isVisibleAttribute,
  hasDraftAndPublish,
  isDraft,
  isSingleType,
  isCollectionType,
  isKind,
  getContentTypeRoutePrefix,
};
