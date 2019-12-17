'use strict';

const _ = require('lodash');

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

    try {
      strapi.reload.isWatching = false;

      const component = await contentTypeService.createContentType({
        contentType: body.contentType,
        components: body.components,
      });

      if (_.isEmpty(strapi.api)) {
        strapi.emit('didCreateFirstContentType');
      } else {
        strapi.emit('didCreateContentType');
      }

      setImmediate(() => strapi.reload());

      ctx.send({ data: { uid: component.uid } }, 201);
    } catch (error) {
      strapi.log.error(error);
      strapi.emit('didNotCreateContentType', error);
      ctx.send({ error: error.message }, 400);
    }
  },

  async updateContentType(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    if (!_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    try {
      await validateUpdateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    try {
      strapi.reload.isWatching = false;

      const component = await contentTypeService.editContentType(uid, {
        contentType: body.contentType,
        components: body.components,
      });

      setImmediate(() => strapi.reload());

      ctx.send({ data: { uid: component.uid } }, 201);
    } catch (error) {
      strapi.log.error(error);
      ctx.send({ error: error.message }, 400);
    }
  },

  async deleteContentType(ctx) {
    const { uid } = ctx.params;

    if (!_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    try {
      strapi.reload.isWatching = false;

      const component = await contentTypeService.deleteContentType(uid);

      setImmediate(() => strapi.reload());

      ctx.send({ data: { uid: component.uid } });
    } catch (error) {
      strapi.log.error(error);
      ctx.send({ error: error.message }, 400);
    }
  },
};
