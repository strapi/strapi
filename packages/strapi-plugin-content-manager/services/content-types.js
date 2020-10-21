'use strict';

const _ = require('lodash');
const { prop, propOr, startsWith, pipe } = require('lodash/fp');
const pluralize = require('pluralize');

const storeUtils = require('./utils/store');
const { pickSchemaFields } = require('./utils/schema');

const SINGLE_TYPE = 'singleType';
const COLLECTION_TYPE = 'collectionType';

const toUID = (name, plugin) => {
  const model = strapi.getModel(name, plugin);
  return model.uid;
};

const formatContentTypeLabel = contentType => {
  const { kind } = contentType;
  const name = _.get(contentType, ['info', 'name'], contentType.modelName);

  return kind === SINGLE_TYPE ? _.upperFirst(name) : _.upperFirst(pluralize(name));
};

// TODO: find a way to get ride of this
const HIDDEN_CONTENT_TYPES = [
  'strapi::admin',
  'plugins::upload.file',
  'plugins::users-permissions.permission',
  'plugins::users-permissions.role',
  'strapi::permission',
  'strapi::role',
  'strapi::user',
];

const formatContentType = contentType => {
  return {
    uid: contentType.uid,
    name: _.get(contentType, ['info', 'name']),
    apiID: contentType.modelName,
    label: formatContentTypeLabel(contentType),
    isDisplayed: HIDDEN_CONTENT_TYPES.includes(contentType.uid) ? false : true,
    schema: {
      ...formatContentTypeSchema(contentType),
      kind: contentType.kind || COLLECTION_TYPE,
    },
  };
};

const formatAttributes = model => {
  return Object.keys(model.attributes).reduce((acc, key) => {
    if (['created_by', 'updated_by'].includes(key)) {
      return acc;
    }

    acc[key] = formatAttribute(key, model.attributes[key], { model });
    return acc;
  }, {});
};

const formatAttribute = (key, attribute, { model }) => {
  if (_.has(attribute, 'type')) return attribute;

  // format relations
  const relation = (model.associations || []).find(assoc => assoc.alias === key);

  const { plugin } = attribute;
  let targetEntity = attribute.model || attribute.collection;

  if (plugin === 'upload' && targetEntity === 'file') {
    return {
      type: 'media',
      multiple: attribute.collection ? true : false,
      required: attribute.required ? true : false,
      allowedTypes: attribute.allowedTypes,
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

  const [createdAtAttribute, updatedAtAttribute] = _.get(contentType, ['options', 'timestamps']);

  return {
    [createdAtAttribute]: {
      type: 'timestamp',
    },
    [updatedAtAttribute]: {
      type: 'timestamp',
    },
  };
};

const getDisplayedContentTypesUids = () => {
  return Object.keys(strapi.contentTypes).filter(ct => !HIDDEN_CONTENT_TYPES.includes(ct));
};

const getKind = propOr(COLLECTION_TYPE, 'kind');

const isStrapiContentType = pipe([prop('uid'), startsWith('strapi::')]);

const getContentTypesByKind = ({ kind = COLLECTION_TYPE } = {}) => {
  return Object.values(strapi.contentTypes)
    .filter(contentType => {
      return !isStrapiContentType(contentType) && getKind(contentType) === kind;
    })
    .map(formatContentType);
};

//  Configuration methods

const STORE_KEY_PREFIX = 'content_types';

const uidToStoreKey = uid => {
  return `${STORE_KEY_PREFIX}::${uid}`;
};

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

module.exports = {
  getContentTypesByKind,
  formatContentType,
  formatContentTypeSchema,
  getDisplayedContentTypesUids,
  getConfiguration,
  setConfiguration,
  deleteConfiguration,
};
