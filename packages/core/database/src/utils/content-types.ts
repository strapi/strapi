import type { Model } from '../types';

export interface Attribute {
  type: string;
  multiple?: boolean;
}

export interface ContentType {
  uid: string;
  modelName: string;
  collectionName: string;
  attributes: Record<string, Attribute>;
}

const transformAttribute = (attribute: Attribute) => {
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

// TODO: model logic outside DB
export const transformContentTypes = (contentTypes: ContentType[]): Model[] => {
  return contentTypes.map((contentType) => {
    const model = {
      ...contentType,
      // reuse new model def
      singularName: contentType.modelName,
      tableName: contentType.collectionName,
      attributes: {
        ...Object.keys(contentType.attributes || {}).reduce((attrs, attrName) => {
          return Object.assign(attrs, {
            [attrName]: transformAttribute(contentType.attributes[attrName]),
          });
        }, {}),
      },
    };

    return model;
  });
};
