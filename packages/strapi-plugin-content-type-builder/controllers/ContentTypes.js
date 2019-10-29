'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');

const generator = require('strapi-generate');
const { formatAttributes, convertAttributes } = require('../utils/attributes');
const { nameToSlug } = require('../utils/helpers');
const { validateContentTypeInput } = require('./validation/contentType');

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

    strapi.reload.isWatching = false;

    try {
      await validateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const slug = nameToSlug(body.name);
    const uid = `application::${slug}.${slug}`;

    if (_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.alreadyExists' }, 400);
    }

    const contentType = createContentTypeSchema(body);

    await generateAPI(slug, contentType);

    // create relations
    strapi.reload();

    ctx.send({
      data: {
        uid,
      },
    });
  },
};

const formatContentType = contentType => {
  const { uid, plugin, connection, collectionName, info } = contentType;

  return {
    uid,
    plugin,
    schema: {
      icon: _.get(info, 'icon'),
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
    infos.collectionName || `${nameToSlug(pluralize(infos.name))}`,
  info: {
    name: infos.name,
    description: infos.description,
  },
  attributes: convertAttributes(infos.attributes),
});

const generateAPI = (name, contentType) => {
  // create api
  return new Promise((resolve, reject) => {
    const scope = {
      generatorType: 'api',
      id: name,
      rootPath: strapi.dir,
      args: {
        api: name,
        name: contentType.info.name,
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
