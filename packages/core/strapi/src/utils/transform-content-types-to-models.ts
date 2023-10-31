import { DatabaseConfig } from '@strapi/database';
import { Schema, Attribute } from '@strapi/types';

const transformAttribute = (attribute: Attribute.Any) => {
  switch (attribute.type) {
    case 'media': {
      return {
        type: 'relation',
        relation: attribute.multiple === true ? 'morphMany' : 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      };
    }
    default: {
      return attribute;
    }
  }
};

export const transformContentTypesToModels = (
  contentTypes: Pick<Schema.ContentType, 'uid' | 'modelName' | 'collectionName' | 'attributes'>[]
): DatabaseConfig['models'] => {
  return contentTypes.map((contentType) => {
    const model = {
      ...contentType,
      // reuse new model def
      singularName: contentType.modelName,
      tableName: contentType.collectionName!,
      attributes: {
        ...Object.keys(contentType.attributes! || {}).reduce((attrs, attrName) => {
          return Object.assign(attrs, {
            [attrName]: transformAttribute(contentType.attributes[attrName]!),
          });
        }, {}),
      },
    };

    return model;
  });
};
