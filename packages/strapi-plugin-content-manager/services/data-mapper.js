'use strict';

const { upperFirst, has, prop, pick, getOr } = require('lodash/fp');
const pluralize = require('pluralize');
const { contentTypes: contentTypesUtils } = require('strapi-utils');

const dtoFields = [
  'uid',
  'isDisplayed',
  'apiID',
  'kind',
  'category',
  'info',
  'options',
  'pluginOptions',
  'attributes',
  'pluginOptions',
];

module.exports = {
  toContentManagerModel(contentType) {
    return {
      ...contentType,
      apiID: contentType.modelName,
      isDisplayed: isVisible(contentType),
      info: {
        ...contentType.info,
        label: formatContentTypeLabel(contentType),
      },
      attributes: {
        id: {
          type: contentType.primaryKeyType,
        },
        ...formatAttributes(contentType),
        ...contentTypesUtils.getTimestampsAttributes(contentType),
      },
    };
  },

  toDto: pick(dtoFields),
};

const formatContentTypeLabel = contentType => {
  const name = prop('info.name', contentType) || contentType.modelName;

  try {
    return contentTypesUtils.isSingleType(contentType)
      ? upperFirst(name)
      : upperFirst(pluralize(name));
  } catch (error) {
    // in case pluralize throws cyrillic characters
    return upperFirst(name);
  }
};

const formatAttributes = model => {
  const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

  return Object.keys(model.attributes).reduce((acc, key) => {
    if ([CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE].includes(key)) {
      return acc;
    }

    acc[key] = formatAttribute(key, model.attributes[key], { model });
    return acc;
  }, {});
};

const formatAttribute = (key, attribute, { model }) => {
  if (has('type', attribute)) return attribute;

  let targetEntity = attribute.model || attribute.collection;
  if (attribute.plugin === 'upload' && targetEntity === 'file') {
    return toMedia(attribute);
  }

  const relation = (model.associations || []).find(assoc => assoc.alias === key);
  return toRelation(attribute, relation);
};

const toMedia = attribute => {
  return {
    type: 'media',
    multiple: attribute.collection ? true : false,
    required: attribute.required ? true : false,
    allowedTypes: attribute.allowedTypes,
  };
};

const toRelation = (attribute, relation) => {
  return {
    ...attribute,
    type: 'relation',
    targetModel: relation.targetUid,
    relationType: relation.nature,
  };
};

const isVisible = model => getOr(true, 'pluginOptions.content-manager.visible', model) === true;
