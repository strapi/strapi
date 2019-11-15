'use strict';

const _ = require('lodash');

const pluralize = require('pluralize');
const storeUtils = require('./utils/store');
const { pickSchemaFields } = require('./utils/schema');

const uidToStoreKey = uid => {
  return `content_types::${uid}`;
};

const toUID = (name, plugin) => {
  const model = strapi.getModel(name, plugin);
  return model.uid;
};

const formatContentTypeLabel = label => _.upperFirst(pluralize(label));

const HIDDEN_CONTENT_TYPES = [
  'strapi::admin',
  'plugins::upload.file',
  'plugins::users-permissions.permission',
  'plugins::users-permissions.role',
];

const getConfiguration = uid => {
  const storeKey = uidToStoreKey(uid);
  return storeUtils.getModelConfiguration(storeKey);
};

const setConfiguration = (uid, input) => {
  const { settings, metadatas, layouts } = input;

  const storeKey = uidToStoreKey(uid);
  return storeUtils.setModelConfiguration(storeKey, {
    uid,
    settings,
    metadatas,
    layouts,
  });
};

const deleteConfiguration = uid => {
  const storeKey = uidToStoreKey(uid);
  return storeUtils.deleteKey(storeKey);
};

const formatContentType = contentType => {
  return {
    uid: contentType.uid,
    name: _.get(contentType, ['info', 'name']),
    label: formatContentTypeLabel(
      _.get(contentType, ['info', 'name'], contentType.modelName)
    ),
    isDisplayed: HIDDEN_CONTENT_TYPES.includes(contentType.uid) ? false : true,
    schema: formatContentTypeSchema(contentType),
  };
};

const formatAttributes = model => {
  return Object.keys(model.attributes).reduce((acc, key) => {
    acc[key] = formatAttribute(key, model.attributes[key], { model });
    return acc;
  }, {});
};

const formatAttribute = (key, attribute, { model }) => {
  if (_.has(attribute, 'type')) return attribute;

  // format relations
  const relation = (model.associations || []).find(
    assoc => assoc.alias === key
  );

  const { plugin } = attribute;
  let targetEntity = attribute.model || attribute.collection;

  if (plugin === 'upload' && targetEntity === 'file') {
    return {
      type: 'media',
      multiple: attribute.collection ? true : false,
      required: attribute.required ? true : false,
    };
  } else {
    return {
      ...attribute,
      type: 'relation',
      targetModel: targetEntity === '*' ? '*' : toUID(targetEntity, plugin),
      relationType: relation.nature,
    };
  }
};

const formatContentTypeSchema = contentType => {
  return {
    ...pickSchemaFields(contentType),
    attributes: {
      id: {
        type: contentType.primaryKeyType,
      },
      ...formatAttributes(contentType),
      ...createTimestampsSchema(contentType),
    },
  };
};

const createTimestampsSchema = contentType => {
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
};

module.exports = {
  getConfiguration,
  setConfiguration,
  deleteConfiguration,
  formatContentType,
  formatContentTypeSchema,
};
