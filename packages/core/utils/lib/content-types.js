'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');

const SINGLE_TYPE = 'singleType';
const COLLECTION_TYPE = 'collectionType';

const ID_ATTRIBUTE = 'id';
const PUBLISHED_AT_ATTRIBUTE = 'published_at';
const CREATED_BY_ATTRIBUTE = 'created_by';
const UPDATED_BY_ATTRIBUTE = 'updated_by';

const CREATED_AT_ATTRIBUTE = 'created_at';
const UPDATED_AT_ATTRIBUTE = 'updated_at';

const DP_PUB_STATE_LIVE = 'live';
const DP_PUB_STATE_PREVIEW = 'preview';
const DP_PUB_STATES = [DP_PUB_STATE_LIVE, DP_PUB_STATE_PREVIEW];

const constants = {
  ID_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  DP_PUB_STATES,
  DP_PUB_STATE_LIVE,
  DP_PUB_STATE_PREVIEW,
  SINGLE_TYPE,
  COLLECTION_TYPE,
};

const getTimestamps = () => {
  return [CREATED_AT_ATTRIBUTE, UPDATED_AT_ATTRIBUTE];
};

const getNonWritableAttributes = (model = {}) => {
  const nonWritableAttributes = _.reduce(
    model.attributes,
    (acc, attr, attrName) => (attr.writable === false ? acc.concat(attrName) : acc),
    []
  );

  return _.uniq([ID_ATTRIBUTE, ...getTimestamps(), ...nonWritableAttributes]);
};

const getWritableAttributes = (model = {}) => {
  return _.difference(Object.keys(model.attributes), getNonWritableAttributes(model));
};

const isWritableAttribute = (model, attributeName) => {
  return getWritableAttributes(model).includes(attributeName);
};

const getNonVisibleAttributes = model => {
  const nonVisibleAttributes = _.reduce(
    model.attributes,
    (acc, attr, attrName) => (attr.visible === false ? acc.concat(attrName) : acc),
    []
  );

  return _.uniq([ID_ATTRIBUTE, ...getTimestamps(), ...nonVisibleAttributes]);
};

const getVisibleAttributes = model => {
  return _.difference(_.keys(model.attributes), getNonVisibleAttributes(model));
};

const isVisibleAttribute = (model, attributeName) => {
  return getVisibleAttributes(model).includes(attributeName);
};

const hasDraftAndPublish = model => _.get(model, 'options.draftAndPublish', false) === true;

const isDraft = (data, model) =>
  hasDraftAndPublish(model) && _.get(data, PUBLISHED_AT_ATTRIBUTE) === null;

const isSingleType = ({ kind = COLLECTION_TYPE }) => kind === SINGLE_TYPE;
const isCollectionType = ({ kind = COLLECTION_TYPE }) => kind === COLLECTION_TYPE;
const isKind = kind => model => model.kind === kind;

const getPrivateAttributes = (model = {}) => {
  return _.union(
    strapi.config.get('api.responses.privateAttributes', []),
    _.get(model, 'options.privateAttributes', []),
    _.keys(_.pickBy(model.attributes, attr => !!attr.private))
  );
};

const isPrivateAttribute = (model = {}, attributeName) => {
  return model && model.privateAttributes && model.privateAttributes.includes(attributeName);
};

const isScalarAttribute = attribute => {
  return ['component', 'relation', 'dynamiczone'].includes(attribute.type);
};

const isMediaAttribute = attr => {
  return attr.type === 'media';
};

const getKind = obj => obj.kind || 'collectionType';

const pickSchema = model => {
  const schema = _.cloneDeep(
    _.pick(model, ['collectionName', 'info', 'options', 'pluginOptions', 'attributes'])
  );

  schema.kind = getKind(model);
  return schema;
};

const createContentType = (model, { modelName }, { apiName, pluginName } = {}) => {
  if (apiName) {
    Object.assign(model, {
      uid: `application::${apiName}.${modelName}`,
      apiName,
      collectionName: model.collectionName || modelName.toLocaleLowerCase(),
      globalId: getGlobalId(model, modelName),
    });
  } else if (pluginName) {
    Object.assign(model, {
      uid: `plugins::${pluginName}.${modelName}`,
      plugin: pluginName,
      collectionName: model.collectionName || `${pluginName}_${modelName}`.toLowerCase(),
      globalId: getGlobalId(model, modelName, pluginName),
    });
  } else {
    Object.assign(model, {
      uid: `strapi::${modelName}`,
      plugin: 'admin',
      globalId: getGlobalId(model, modelName, 'admin'),
    });
  }

  Object.assign(model, {
    __schema__: pickSchema(model),
    kind: getKind(model),
    modelType: 'contentType',
    modelName,
  });

  Object.defineProperty(model, 'privateAttributes', {
    get() {
      // FIXME: to fix
      // return strapi.getModel(model.uid).privateAttributes;
      return [];
    },
  });

  Object.assign(model.attributes, {
    [CREATED_AT_ATTRIBUTE]: {
      type: 'datetime',
      // default: () => new Date(),
    },
    [UPDATED_AT_ATTRIBUTE]: {
      type: 'datetime',
    },
  });

  if (hasDraftAndPublish(model)) {
    model.attributes[PUBLISHED_AT_ATTRIBUTE] = {
      type: 'datetime',
      configurable: false,
      writable: true,
      visible: false,
    };
  }

  const isPrivate = !_.get(model, 'options.populateCreatorFields', false);

  model.attributes[CREATED_BY_ATTRIBUTE] = {
    type: 'relation',
    relation: 'oneToOne',
    target: 'strapi::user',
    configurable: false,
    writable: false,
    visible: false,
    useJoinTable: false,
    private: isPrivate,
  };

  model.attributes[UPDATED_BY_ATTRIBUTE] = {
    type: 'relation',
    relation: 'oneToOne',
    target: 'strapi::user',
    configurable: false,
    writable: false,
    visible: false,
    useJoinTable: false,
    private: isPrivate,
  };
};

const getGlobalId = (model, modelName, prefix) => {
  let globalId = prefix ? `${prefix}-${modelName}` : modelName;

  return model.globalId || _.upperFirst(_.camelCase(globalId));
};

const isRelationalAttribute = attribute => attribute.type === 'relation';
const isComponentAttribute = attribute => ['component', 'dynamiczone'].includes(attribute.type);

/**
 * Checks if an attribute is of type `type`
 * @param {object} attribute
 * @param {string} type
 */
const isTypedAttribute = (attribute, type) => {
  return _.has(attribute, 'type') && attribute.type === type;
};

/**
 *  Returns a route prefix for a contentType
 * @param {object} contentType
 * @returns {string}
 */
const getContentTypeRoutePrefix = contentType => {
  return isSingleType(contentType)
    ? _.kebabCase(contentType.modelName)
    : _.kebabCase(pluralize(contentType.modelName));
};

module.exports = {
  isScalarAttribute,
  isMediaAttribute,
  isRelationalAttribute,
  isComponentAttribute,
  isTypedAttribute,
  getPrivateAttributes,
  isPrivateAttribute,
  constants,
  getNonWritableAttributes,
  getWritableAttributes,
  isWritableAttribute,
  getNonVisibleAttributes,
  getVisibleAttributes,
  isVisibleAttribute,
  hasDraftAndPublish,
  isDraft,
  isSingleType,
  isCollectionType,
  isKind,
  createContentType,
  getGlobalId,
  getContentTypeRoutePrefix,
};
