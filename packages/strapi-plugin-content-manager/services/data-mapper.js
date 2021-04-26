'use strict';

const { upperFirst, has, prop, pick, getOr } = require('lodash/fp');
const pluralize = require('pluralize');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { isMediaAttribute } = require('strapi-utils').contentTypes;

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
  const { getVisibleAttributes } = contentTypesUtils;

  // only get attributes that can be seen in the auto generated Edit view or List view
  return getVisibleAttributes(model).reduce((acc, key) => {
    acc[key] = formatAttribute(key, model.attributes[key], { model });
    return acc;
  }, {});
};

const formatAttribute = (key, attribute, { model }) => {
  if (has('type', attribute)) return attribute;

  if (isMediaAttribute(attribute)) {
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
    pluginOptions: attribute.pluginOptions,
  };
};

const toRelation = (attribute, relation) => {
  return {
    ...attribute,
    type: 'relation',
    targetModel: relation.targetUid,
    relationType: relation.nature,
    pluginOptions: attribute.pluginOptions,
  };
};

const isVisible = model => getOr(true, 'pluginOptions.content-manager.visible', model) === true;
