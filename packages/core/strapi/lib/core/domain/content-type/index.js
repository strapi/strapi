'use strict';

const { cloneDeep } = require('lodash/fp');
const _ = require('lodash');
const { hasDraftAndPublish } = require('@strapi/utils').contentTypes;
const {
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
} = require('@strapi/utils').contentTypes.constants;
const { validateContentTypeDefinition } = require('./validator');

const createContentType = (definition, { apiName, pluginName } = {}) => {
  try {
    validateContentTypeDefinition(definition);
  } catch (e) {
    throw new Error(
      `
Content Type Definition is invalid in ${apiName || pluginName || 'the core'}.
${e.errors}
    `.trim()
    );
  }

  const createdContentType = cloneDeep(definition);

  // general info
  Object.assign(createdContentType.schema, {
    kind: createdContentType.schema.kind || 'collectionType',
    __schema__: pickSchema(definition.schema),
    modelType: 'contentType',
    modelName: definition.schema.info.singularName,
    connection: 'default',
  });

  if (apiName) {
    Object.assign(createdContentType.schema, {
      uid: `application::${apiName}.${definition.schema.info.singularName}`,
      apiName,
      collectionName: definition.schema.collectionName || definition.schema.info.singularName,
      globalId: getGlobalId(definition.schema, definition.schema.info.singularName),
    });
  } else if (pluginName) {
    Object.assign(createdContentType.schema, {
      uid: `plugins::${pluginName}.${definition.schema.info.singularName}`,
      plugin: pluginName,
      collectionName:
        createdContentType.schema.collectionName ||
        `${pluginName}_${definition.schema.info.singularName}`.toLowerCase(),
      globalId: getGlobalId(definition.schema, definition.schema.info.singularName, pluginName),
    });
  } else {
    Object.assign(createdContentType.schema, {
      uid: `strapi::${definition.schema.info.singularName}`,
      plugin: 'admin',
      globalId: getGlobalId(definition.schema, definition.schema.info.singularName, 'admin'),
    });
  }

  Object.defineProperty(createdContentType.schema, 'privateAttributes', {
    get() {
      // FIXME: to fix
      // return strapi.getModel(model.uid).privateAttributes;
      return [];
    },
  });

  // attributes
  Object.assign(createdContentType.schema.attributes, {
    [CREATED_AT_ATTRIBUTE]: {
      type: 'datetime',
      // default: () => new Date(),
    },
    [UPDATED_AT_ATTRIBUTE]: {
      type: 'datetime',
    },
  });

  if (hasDraftAndPublish(createdContentType.schema)) {
    createdContentType.schema.attributes[PUBLISHED_AT_ATTRIBUTE] = {
      type: 'datetime',
      configurable: false,
      writable: true,
      visible: false,
    };
  }

  const isPrivate = !_.get(createdContentType.schema, 'options.populateCreatorFields', false);

  createdContentType.schema.attributes[CREATED_BY_ATTRIBUTE] = {
    type: 'relation',
    relation: 'oneToOne',
    target: 'strapi::user',
    configurable: false,
    writable: false,
    visible: false,
    useJoinTable: false,
    private: isPrivate,
  };

  createdContentType.schema.attributes[UPDATED_BY_ATTRIBUTE] = {
    type: 'relation',
    relation: 'oneToOne',
    target: 'strapi::user',
    configurable: false,
    writable: false,
    visible: false,
    useJoinTable: false,
    private: isPrivate,
  };

  return createdContentType;
};

const getGlobalId = (model, modelName, prefix) => {
  let globalId = prefix ? `${prefix}-${modelName}` : modelName;

  return model.globalId || _.upperFirst(_.camelCase(globalId));
};

const pickSchema = model => {
  const schema = _.cloneDeep(
    _.pick(model, [
      'connection',
      'collectionName',
      'info',
      'options',
      'pluginOptions',
      'attributes',
    ])
  );

  schema.kind = model.kind || 'collectionType';
  return schema;
};

module.exports = {
  createContentType,
};
