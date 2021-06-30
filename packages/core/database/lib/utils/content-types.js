'use strict';

const transformAttribute = attribute => {
  switch (attribute.type) {
    case 'media': {
      // convert to relation
      return {
        type: 'relation',
        relation: attribute.single === true ? 'manyToOne' : 'manyToMany', //'morphOne' : 'morphMany',
        target: 'plugins::upload.file',
        // morphOn: 'related',
      };
    }
    // case 'component': {
    // TODO: transform into relation here instead of in the meta ?
    // }
    default: {
      return attribute;
    }
  }
};

// TODO: add published_at for D&P
// TODO: add locale & localizations for I18N
const transformContentTypes = contentTypes => {
  return contentTypes.map(contentType => {
    return {
      ...contentType,
      // reuse new model def
      singularName: contentType.modelName,
      tableName: contentType.collectionName,
      attributes: {
        createdAt: {
          type: 'datetime',
          // default: () => new Date(),
        },
        updatedAt: {
          type: 'datetime',
        },
        ...Object.keys(contentType.attributes).reduce((attrs, attrName) => {
          return Object.assign(attrs, {
            [attrName]: transformAttribute(contentType.attributes[attrName]),
          });
        }, {}),
      },
    };
  });
};

module.exports = { transformContentTypes };
