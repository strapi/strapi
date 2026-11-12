import type { Schema, Struct } from '@strapi/types';
import _ from 'lodash';
import { hasDefaultAttribute } from '../../utils/typeguards';

// Runs before the payload is validated, so attributes are not yet known to be valid
export const removeEmptyDefaults = (data: { attributes?: Record<string, unknown> } | undefined) => {
  const { attributes } = data || {};

  // Leave attributes that are not an object to the validation, which rejects them
  if (_.isPlainObject(attributes) === false) {
    return;
  }

  Object.keys(attributes!).forEach((attributeName) => {
    const attribute = attributes![attributeName] as Schema.Attribute.AnyAttribute;

    if (
      _.isPlainObject(attribute) === true &&
      hasDefaultAttribute(attribute) &&
      attribute.default === ''
    ) {
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
