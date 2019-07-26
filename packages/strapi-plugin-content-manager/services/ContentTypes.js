'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const storeUtils = require('./utils/store');
const { pickSchemaFields } = require('./utils/schema');

const uidToStoreKey = ({ uid, source }) => {
  const sourceKey = source ? `${source}.${uid}` : uid;
  return `content_types::${sourceKey}`;
};

const formatContentTypeLabel = label => _.upperFirst(pluralize(label));

const getModelIn = source => uid => _.get(source, ['models', uid], null);

module.exports = {
  uidToStoreKey,

  getConfiguration({ uid, source }) {
    const storeKey = uidToStoreKey({ uid, source });
    return storeUtils.getModelConfiguration(storeKey);
  },

  setConfiguration({ uid, source }, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = uidToStoreKey({ uid, source });
    return storeUtils.setModelConfiguration(storeKey, {
      uid,
      source,
      settings,
      metadatas,
      layouts,
    });
  },

  deleteConfiguration({ uid, source }) {
    const storeKey = uidToStoreKey({ uid, source });
    return storeUtils.deleteKey(storeKey);
  },

  formatContentType(uid, contentType, opts = {}) {
    const { source = null, isDisplayed = true } = opts;

    return {
      uid,
      name: uid,
      label: formatContentTypeLabel(_.get(contentType, ['info', 'name'], uid)),
      isDisplayed,
      source,
      schema: this.formatContentTypeSchema(contentType),
    };
  },

  formatContentTypeSchema(contentType) {
    const { associations, allAttributes } = contentType;
    return {
      ...pickSchemaFields(contentType),
      attributes: {
        [contentType.primaryKey]: {
          type: contentType.primaryKeyType,
        },
        id: {
          type: contentType.primaryKeyType,
        },
        ...Object.keys(allAttributes).reduce((acc, key) => {
          const attribute = allAttributes[key];
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
          } else {
            acc[key] = attribute;
          }
          return acc;
        }, {}),
      },
    };
  },

  findContentTypeModel({ uid, source }) {
    const getModel = getModelIn(
      !source
        ? strapi
        : source === 'admin'
        ? strapi.admin
        : strapi.plugins[source] || {}
    );
    return getModel(uid);
  },

  async updateUID({ oldUID, newUID, source }) {
    const oldKey = uidToStoreKey({ uid: oldUID, source });
    const newKey = uidToStoreKey({ uid: newUID, source });

    await storeUtils.setModelConfiguration(oldKey, {
      uid: oldUID,
    });

    return storeUtils.moveKey(oldKey, newKey);
  },
};
