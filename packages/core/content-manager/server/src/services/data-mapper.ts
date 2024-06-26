import { pick, getOr } from 'lodash/fp';
import { contentTypes as contentTypesUtils } from '@strapi/utils';
import { Attribute, Schema } from '@strapi/types';

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

export default () => ({
  toContentManagerModel(contentType: Schema.Component) {
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

const formatAttributes = (contentType: Schema.Component) => {
  const { getVisibleAttributes, getTimestamps, getCreatorFields } = contentTypesUtils;

  // only get attributes that can be seen in the auto generated Edit view or List view
  return getVisibleAttributes(contentType)
    .concat(getTimestamps(contentType))
    .concat(getCreatorFields(contentType))
    .reduce((acc: any, key: string) => {
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
const formatAttribute = (key: any, attribute: Attribute.Any) => {
  if (attribute.type === 'relation') {
    return toRelation(attribute);
  }

  return attribute;
};

// FIXME: not needed
const toRelation = (attribute: Attribute.Relation) => {
  return {
    ...attribute,
    type: 'relation',
    targetModel: 'target' in attribute ? attribute.target : undefined,
    relationType: attribute.relation,
  };
};

const isVisible = (model: Schema.Component): boolean =>
  getOr(true, 'pluginOptions.content-manager.visible', model) === true;
