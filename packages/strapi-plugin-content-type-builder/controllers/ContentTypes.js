'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const fse = require('fs-extra');
const path = require('path');

const generator = require('strapi-generate');
const { formatAttributes, convertAttributes } = require('../utils/attributes');
const { nameToSlug } = require('../utils/helpers');
const {
  validateContentTypeInput,
  validateUpdateContentTypeInput,
} = require('./validation/content-type');

module.exports = {
  getContentTypes(ctx) {
    const contentTypes = Object.keys(strapi.contentTypes)
      .filter(uid => {
        if (uid.startsWith('strapi::')) return false;
        if (uid === 'plugins::upload.file') return false; // TODO: add a flag in the content type instead

        return true;
      })
      .map(uid => formatContentType(strapi.contentTypes[uid]));

    ctx.send({
      data: contentTypes,
    });
  },

  getContentType(ctx) {
    const { uid } = ctx.params;

    const contentType = strapi.contentTypes[uid];

    if (!contentType) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    ctx.send({ data: formatContentType(contentType) });
  },

  async createContentType(ctx) {
    const { body } = ctx.request;

    try {
      await validateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const modelName = nameToSlug(body.name);
    const uid = `application::${modelName}.${modelName}`;

    if (_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.alreadyExists' }, 400);
    }

    strapi.reload.isWatching = false;

    try {
      const contentType = createContentTypeSchema(body);

      await generateAPI(modelName, contentType);

      await generateReversedRelations({
        attributes: body.attributes,
        modelName,
      });

      if (_.isEmpty(strapi.api)) {
        strapi.emit('didCreateFirstContentType');
      } else {
        strapi.emit('didCreateContentType');
      }
    } catch (e) {
      strapi.log.error(e);
      strapi.emit('didNotCreateContentType', e);
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.write' }] },
      ]);
    }

    setImmediate(() => strapi.reload());

    ctx.send({
      data: {
        uid,
      },
    });
  },

  async updateContentType(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const contentType = strapi.contentTypes[uid];

    if (!contentType) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    try {
      await validateUpdateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    strapi.reload.isWatching = false;

    try {
      const newSchema = updateContentTypeSchema(contentType.__schema__, body);

      await writeContentType({ uid, schema: newSchema });

      // delete all relations directed to the updated ct except for oneWay and manyWay
      await deleteBidirectionalRelations(contentType);

      await generateReversedRelations({
        attributes: body.attributes,
        modelName: contentType.modelName,
        plugin: contentType.plugin,
      });

      if (_.isEmpty(strapi.api)) {
        strapi.emit('didCreateFirstContentType');
      } else {
        strapi.emit('didCreateContentType');
      }
    } catch (e) {
      strapi.log.error(e);
      strapi.emit('didNotCreateContentType', e);
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.write' }] },
      ]);
    }

    setImmediate(() => strapi.reload());

    ctx.send({
      data: {
        uid,
      },
    });
  },
};

const deleteBidirectionalRelations = ({ modelName, plugin }) => {
  const updates = Object.keys(strapi.contentTypes).map(uid => {
    const { __schema__ } = strapi.contentTypes[uid];

    const keysToDelete = Object.keys(__schema__.attributes).filter(key => {
      const attr = __schema__.attributes[key];
      const target = attr.model || attr.collection;

      const sameModel = target === modelName;
      const samePluginOrNoPlugin =
        (attr.plugin && attr.plugin === plugin) || !attr.plugin;

      const isBiDirectionnal = _.has(attr, 'via');

      if (samePluginOrNoPlugin && sameModel && isBiDirectionnal) {
        return true;
      }

      return false;
    });

    if (keysToDelete.length > 0) {
      const newchema = {
        ...__schema__,
        attributes: _.omit(__schema__.attributes, keysToDelete),
      };

      return writeContentType({ uid, schema: newchema });
    }
  });

  return Promise.all(updates);
};

const buildReversedRelation = ({ key, attr, plugin, modelName }) => {
  const targetAttributeOptions = {
    via: key,
    columnName: attr.targetColumnName,
    plugin,
  };

  switch (attr.nature) {
    case 'manyWay':
    case 'oneWay':
      return;
    case 'oneToOne':
    case 'oneToMany':
      targetAttributeOptions.model = modelName;
      break;
    case 'manyToOne':
      targetAttributeOptions.collection = modelName;
      break;
    case 'manyToMany': {
      targetAttributeOptions.collection = modelName;

      if (!targetAttributeOptions.dominant) {
        targetAttributeOptions.dominant = true;
      }
      break;
    }
    default:
  }

  return targetAttributeOptions;
};

const generateReversedRelations = ({ attributes, modelName, plugin }) => {
  const promises = Object.keys(attributes)
    .filter(key => _.has(attributes[key], 'target'))
    .map(key => {
      const attr = attributes[key];
      const target = strapi.contentTypes[attr.target];

      const schema = _.merge({}, target.__schema__, {
        attributes: {
          [attr.targetAttribute]: buildReversedRelation({
            key,
            attr,
            plugin,
            modelName,
          }),
        },
      });

      return writeContentType({ uid: attr.target, schema });
    });

  return Promise.all(promises);
};

const writeContentType = async ({ uid, schema }) => {
  const { plugin, apiName, __filename__ } = strapi.contentTypes[uid];

  let fileDir;
  if (plugin) {
    fileDir = `./extensions/${plugin}/models`;
  } else {
    fileDir = `./api/${apiName}/models`;
  }

  const filePath = path.join(strapi.dir, fileDir, __filename__);

  await fse.ensureFile(filePath);
  return fse.writeFile(filePath, JSON.stringify(schema, null, 2));
};

const formatContentType = contentType => {
  const { uid, plugin, connection, collectionName, info } = contentType;

  return {
    uid,
    plugin,
    schema: {
      name: _.get(info, 'name') || _.upperFirst(pluralize(uid)),
      description: _.get(info, 'description', ''),
      connection,
      collectionName,
      attributes: formatAttributes(contentType),
    },
  };
};

const createContentTypeSchema = infos => ({
  connection:
    infos.connection ||
    _.get(
      strapi,
      ['config', 'currentEnvironment', 'database', 'defaultConnection'],
      'default'
    ),
  collectionName:
    infos.collectionName || `${_.snakeCase(pluralize(infos.name))}`,
  info: {
    name: infos.name,
    description: infos.description,
  },
  attributes: convertAttributes(infos.attributes),
});

const updateContentTypeSchema = (old, infos) => ({
  ...old,
  connection: infos.connection || old.connection,
  collectionName: infos.collectionName || old.collectionName,
  info: {
    name: infos.name || old.info.name,
    description: infos.description || old.info.description,
  },
  // TODO: keep old params like autoMigration, private, configurable
  attributes: convertAttributes(infos.attributes),
});

const generateAPI = (name, contentType) => {
  // create api
  return new Promise((resolve, reject) => {
    const scope = {
      generatorType: 'api',
      id: name,
      name,
      rootPath: strapi.dir,
      args: {
        displayName: contentType.info.name,
        description: contentType.info.description,
        connection: contentType.connection,
        collectionName: contentType.collectionName,
        attributes: contentType.attributes,
      },
    };

    generator(scope, {
      success: () => resolve(),
      error: err => reject(err),
    });
  });
};
