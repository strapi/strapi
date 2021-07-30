'use strict';

const transformAttribute = attribute => {
  switch (attribute.type) {
    case 'media': {
      // TODO: handle a filter on field
      return {
        type: 'relation',
        relation: attribute.single === true ? 'morphOne' : 'morphMany',
        target: 'plugins::upload.file',
        morphBy: 'related',
      };
    }
    default: {
      return attribute;
    }
  }
};

// TODO: model logic outside DB
const transformContentTypes = contentTypes => {
  return contentTypes.map(contentType => {
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

module.exports = { transformContentTypes };
