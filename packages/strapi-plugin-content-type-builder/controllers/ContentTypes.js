'use strict';

const _ = require('lodash');

const { nameToSlug } = require('../utils/helpers');
const {
  validateContentTypeInput,
  validateUpdateContentTypeInput,
} = require('./validation/content-type');

const contentTypeService = require('../services/ContentTypes');

module.exports = {
  getContentTypes(ctx) {
    const contentTypes = Object.keys(strapi.contentTypes)
      .filter(uid => {
        if (uid.startsWith('strapi::')) return false;
        if (uid === 'plugins::upload.file') return false; // TODO: add a flag in the content type instead

        return true;
      })
      .map(uid =>
        contentTypeService.formatContentType(strapi.contentTypes[uid])
      );

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

    ctx.send({ data: contentTypeService.formatContentType(contentType) });
  },

  async createContentType(ctx) {
    const { body } = ctx.request;

    try {
      await validateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const modelName = nameToSlug(body.contentType.name);
    const uid = `application::${modelName}.${modelName}`;

    if (_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.alreadyExists' }, 400);
    }

    strapi.reload.isWatching = false;

    try {
      const contentType = contentTypeService.createContentTypeSchema(
        body.contentType
      );

      await contentTypeService.generateAPI(modelName, contentType);

      await contentTypeService.generateReversedRelations({
        attributes: body.contentType.attributes,
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

    ctx.send(
      {
        data: {
          uid,
        },
      },
      201
    );
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
      const newSchema = contentTypeService.updateContentTypeSchema(
        contentType.__schema__,
        body.contentType
      );

      await contentTypeService.writeContentType({ uid, schema: newSchema });

      // delete all relations directed to the updated ct except for oneWay and manyWay
      await contentTypeService.deleteBidirectionalRelations(contentType);

      await contentTypeService.generateReversedRelations({
        attributes: body.contentType.attributes,
        modelName: contentType.modelName,
        plugin: contentType.plugin,
      });

      if (_.isEmpty(strapi.api)) {
        strapi.emit('didCreateFirstContentType');
      } else {
        strapi.emit('didCreateContentType');
      }
    } catch (error) {
      strapi.emit('didNotCreateContentType', error);
      throw error;
    }

    setImmediate(() => strapi.reload());

    ctx.send({
      data: {
        uid,
      },
    });
  },

  async deleteContentType(ctx) {
    const { uid } = ctx.params;

    const contentType = strapi.contentTypes[uid];

    if (!contentType) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    if (!_.has(contentType, 'apiName')) {
      return ctx.send({ error: 'contentType.not.deletable' }, 400);
    }

    strapi.reload.isWatching = false;

    await contentTypeService.deleteAllRelations(contentType);
    await contentTypeService.removeContentType(contentType);

    setImmediate(() => strapi.reload());

    ctx.send({
      data: {
        uid,
      },
    });
  },
};
