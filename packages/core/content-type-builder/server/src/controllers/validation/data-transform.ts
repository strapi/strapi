import type { Struct } from '@strapi/types';
import _ from 'lodash';
import { hasDefaultAttribute } from '../../utils/typeguards';

export const removeEmptyDefaults = (
  data: Partial<Struct.ContentTypeSchema> | Partial<Struct.ComponentSchema> | undefined
) => {
  const { attributes } = data || {};

  Object.keys(attributes!).forEach((attributeName) => {
    const attribute = attributes![attributeName];

    if (hasDefaultAttribute(attribute) && attribute.default === '') {
      attribute.default = undefined;
    }
  });
};

export const removeDeletedUIDTargetFields = (data: Struct.ContentTypeSchema) => {
  if (_.has(data, 'attributes')) {
    Object.values(data.attributes).forEach((attribute) => {
      if (
        attribute.type === 'uid' &&
        !_.isUndefined(attribute.targetField) &&
        !_.has(data.attributes, attribute.targetField)
      ) {
        attribute.targetField = undefined;
      }
    });
  }
};
