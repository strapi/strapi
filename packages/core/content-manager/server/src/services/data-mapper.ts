import { pick, get } from 'lodash';

import { contentTypes as contentTypesUtils } from '@strapi/utils';

import type { Core, Schema, Struct } from '@strapi/types';

import type {
  ContentManagerAttribute,
  ContentManagerModel,
  DataMapperService,
} from '../types/services';

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

export default (() => ({
  toContentManagerModel(
    contentType: Core.IsStrict extends true
      ? Struct.ComponentSchema | Struct.ContentTypeSchema
      : Struct.ComponentSchema
  ) {
    return {
      ...contentType,
      apiID: contentType.modelName,
      isDisplayed: isVisible(contentType),
      attributes: {
        id: {
          type: 'integer',
        },
        ...formatAttributes(contentType),
        documentId: {
          type: 'string',
        },
      },
    };
  },

  /** @internal */
  toDto: <T extends object>(model: T) => pick(model, dtoFields),
})) satisfies () => Core.Implements<
  // The generic contract member cannot be met without a cast: the factory is checked against it
  // at its constraint, both schema kinds.
  Omit<DataMapperService, 'toContentManagerModel'> & {
    toContentManagerModel(
      model: Struct.ComponentSchema | Struct.ContentTypeSchema
    ): ContentManagerModel<Struct.ComponentSchema | Struct.ContentTypeSchema>;
  }
>;

const formatAttributes = (contentType: Struct.ComponentSchema | Struct.ContentTypeSchema) => {
  const { getVisibleAttributes, getTimestamps, getCreatorFields } = contentTypesUtils;

  // only get attributes that can be seen in the auto generated Edit view or List view
  return getVisibleAttributes(contentType)
    .concat(getTimestamps(contentType))
    .concat(getCreatorFields(contentType))
    .reduce<Core.IsStrict extends true ? Record<string, ContentManagerAttribute> : any>(
      (acc, key: string) => {
        const attribute = contentType.attributes[key];

        // ignore morph until they are handled in the front
        if (attribute.type === 'relation' && attribute.relation.toLowerCase().includes('morph')) {
          return acc;
        }

        acc[key] = formatAttribute(key, attribute);
        return acc;
      },
      {}
    );
};

// FIXME: not needed
const formatAttribute = (key: string, attribute: Schema.Attribute.AnyAttribute) => {
  if (attribute.type === 'relation') {
    return toRelation(attribute);
  }

  return attribute;
};

// FIXME: not needed
const toRelation = (attribute: Schema.Attribute.Relation): ContentManagerAttribute => {
  return {
    ...attribute,
    type: 'relation',
    targetModel: 'target' in attribute ? attribute.target : undefined,
    relationType: attribute.relation,
  };
};

const isVisible = (model: Struct.ComponentSchema | Struct.ContentTypeSchema): boolean =>
  get(model, 'pluginOptions.content-manager.visible', true) === true;
