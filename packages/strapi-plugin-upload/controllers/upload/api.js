'use strict';

const _ = require('lodash');
const validateSettings = require('../validation/settings');
const validateUploadBody = require('../validation/upload');

module.exports = {
  async find(ctx) {
    const method = _.has(ctx.query, '_q') ? 'search' : 'fetchAll';

    ctx.body = await strapi.plugins.upload.services.upload[method](ctx.query);
  },

  async findOne(ctx) {
    const {
      params: { id },
    } = ctx;

    const data = await strapi.plugins.upload.services.upload.fetch({ id });

    if (!data) {
      return ctx.notFound('file.notFound');
    }

    ctx.body = data;
  },

  async count(ctx) {
    const method = _.has(ctx.query, '_q') ? 'countSearch' : 'count';

    ctx.body = await strapi.plugins.upload.services.upload[method](ctx.query);
  },

  async destroy(ctx) {
    const {
      params: { id },
    } = ctx;

    const file = await strapi.plugins['upload'].services.upload.fetch({ id });

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    await strapi.plugins['upload'].services.upload.remove(file);

    ctx.body = file;
  },

  async updateSettings(ctx) {
    const {
      request: { body },
    } = ctx;

    const data = await validateSettings(body);

    await strapi.plugins.upload.services.upload.setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx) {
    const data = await strapi.plugins.upload.services.upload.getSettings();

    ctx.body = { data };
  },

  async updateFileInfo(ctx) {
    const {
      query: { id },
      request: { body },
    } = ctx;
    const data = await validateUploadBody(body);

    ctx.body = await strapi.plugins.upload.services.upload.updateFileInfo(id, data.fileInfo);
  },

  async replaceFile(ctx) {
    const {
      query: { id },
      request: { body, files: { files } = {} },
    } = ctx;

    // cannot replace with more than one file
    if (Array.isArray(files)) {
      throw strapi.errors.badRequest(null, {
        errors: [
          { id: 'Upload.replace.single', message: 'Cannot replace a file with multiple ones' },
        ],
      });
    }

    ctx.body = await strapi.plugins.upload.services.upload.replace(id, {
      data: await validateUploadBody(body),
      file: files,
    });
  },

  async uploadFiles(ctx) {
    const {
      request: { body, files: { files } = {} },
    } = ctx;

    ctx.body = await strapi.plugins.upload.services.upload.upload({
      data: await validateUploadBody(body),
      files,
    });
  },
};
