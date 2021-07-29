'use strict';

const { upperFirst, prop, pick, getOr } = require('lodash/fp');
const pluralize = require('pluralize');
const { contentTypes: contentTypesUtils } = require('@strapi/utils');

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
      options: {
        ...contentType.options,
        timestamps: [],
      },
      apiID: contentType.modelName,
      isDisplayed: isVisible(contentType),
      info: {
        ...contentType.info,
        label: formatContentTypeLabel(contentType),
      },
      attributes: {
        id: {
          type: 'integer',
        },
        ...formatAttributes(contentType),
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

const formatAttributes = contentType => {
  const { getVisibleAttributes } = contentTypesUtils;

  // only get attributes that can be seen in the auto generated Edit view or List view
  return getVisibleAttributes(contentType).reduce((acc, key) => {
    const attribute = contentType.attributes[key];

    // ignore morph until they are handled in the front
    if (attribute.type === 'relation' && attribute.relation.toLowerCase().includes('morph')) {
      return acc;
    }

    acc[key] = formatAttribute(key, attribute);
    return acc;
  }, {});
};

// FIXME: not needed
const formatAttribute = (key, attribute) => {
  if (attribute.type === 'relation') {
    return toRelation(attribute);
  }

  return attribute;
};

// FIXME: not needed
const toRelation = attribute => {
  return {
    ...attribute,
    type: 'relation',
    targetModel: attribute.target,
    relationType: attribute.relation,
    pluginOptions: attribute.pluginOptions,
  };
};

const isVisible = model => getOr(true, 'pluginOptions.content-manager.visible', model) === true;
