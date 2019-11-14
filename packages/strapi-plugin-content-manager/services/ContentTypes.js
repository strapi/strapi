'use strict';

const _ = require('lodash');

const pluralize = require('pluralize');
const storeUtils = require('./utils/store');
const { pickSchemaFields } = require('./utils/schema');

const uidToStoreKey = uid => {
  return `content_types::${uid}`;
};

const formatContentTypeLabel = label => _.upperFirst(pluralize(label));

const HIDDEN_CONTENT_TYPES = [
  'strapi::admin',
  'plugins::upload.file',
  'plugins::users-permissions.permission',
  'plugins::users-permissions.role',
];

module.exports = {
  uidToStoreKey,

  getConfiguration(uid) {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.getModelConfiguration(storeKey);
  },

  setConfiguration(uid, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = uidToStoreKey(uid);
    return storeUtils.setModelConfiguration(storeKey, {
      uid,
      settings,
      metadatas,
      layouts,
    });
  },

  deleteConfiguration(uid) {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.deleteKey(storeKey);
  },

  formatContentType(contentType) {
    return {
      uid: contentType.uid,
      name: _.get(contentType, ['info', 'name']),
      label: formatContentTypeLabel(
        _.get(contentType, ['info', 'name'], contentType.modelName)
      ),
      isDisplayed: HIDDEN_CONTENT_TYPES.includes(contentType.uid)
        ? false
        : true,
      schema: this.formatContentTypeSchema(contentType),
    };
  },

  formatContentTypeSchema(contentType) {
    const { associations, attributes } = contentType;
    return {
      ...pickSchemaFields(contentType),
      attributes: {
        id: {
          type: contentType.primaryKeyType,
        },
        ...Object.keys(attributes).reduce((acc, key) => {
          const attribute = attributes[key];
          const assoc = associations.find(assoc => assoc.alias === key);

          if (assoc) {
            const { plugin } = attribute;
            let targetEntity = attribute.model || attribute.collection;

            if (plugin === 'upload' && targetEntity === 'file') {
              acc[key] = {
                type: 'media',
                multiple: attribute.collection ? true : false,
                required: attribute.required ? true : false,
              };
            } else {
              acc[key] = {
                ...attribute,
                type: 'relation',
                targetModel: targetEntity,
                relationType: assoc.nature,
              };
            }

            return acc;
          }

          acc[key] = attribute;
          return acc;
        }, {}),
        ...addTimestamps(contentType),
      },
    };
  },
};

function addTimestamps(contentType) {
  if (_.get(contentType, 'options.timestamps', false) === false) {
    return {};
  }

  const [createdAtAttribute, updatedAtAttribute] = _.get(contentType, [
    'options',
    'timestamps',
  ]);

  return {
    [createdAtAttribute]: {
      type: 'timestamp',
    },
    [updatedAtAttribute]: {
      type: 'timestamp',
    },
  };
}
