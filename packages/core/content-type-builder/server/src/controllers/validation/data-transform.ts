import type { Schema } from '@strapi/types';
import _ from 'lodash';

// TODO: data should be Schema.ContentType, but it has a bug that default is not a valid property
export const removeEmptyDefaults = (data: any) => {
  if (_.has(data, 'attributes')) {
    Object.keys(data.attributes).forEach((attribute) => {
      if (data.attributes[attribute].default === '') {
        data.attributes[attribute].default = undefined;
      }
    });
  }
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
