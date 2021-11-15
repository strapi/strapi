'use strict';

const { pick, getOr } = require('lodash/fp');
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

module.exports = () => ({
  toContentManagerModel(contentType) {
    return {
      ...contentType,
      apiID: contentType.modelName,
      isDisplayed: isVisible(contentType),
      attributes: {
        id: {
          type: 'integer',
        },
        ...formatAttributes(contentType),
      },
    };
  },

  toDto: pick(dtoFields),
});

const formatAttributes = contentType => {
  const { getVisibleAttributes, getTimestamps } = contentTypesUtils;

  // only get attributes that can be seen in the auto generated Edit view or List view
  return getVisibleAttributes(contentType)
    .concat(getTimestamps(contentType))
    .reduce((acc, key) => {
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
  };
};

const isVisible = model => getOr(true, 'pluginOptions.content-manager.visible', model) === true;
