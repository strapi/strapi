import type { Schema } from '@strapi/types';
import _ from 'lodash';
import { hasDefaultAttribute } from '../../utils/typeguards';

// TODO: data should be Schema.ContentType, but it has a bug that default is not a valid property
export const removeEmptyDefaults = (
  data: Partial<Schema.ContentType> | Partial<Schema.Component>
) => {
  const { attributes } = data;

  if (!attributes) {
    return;
  }

  Object.keys(attributes).forEach((attributeName) => {
    const attribute = attributes[attributeName];

    if (hasDefaultAttribute(attribute) && attribute.default === '') {
      attribute.default = undefined;
    }
  });
};

export const removeDeletedUIDTargetFields = (data: Schema.ContentType) => {
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
