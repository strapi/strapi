'use strict';

const _ = require('lodash');
const { sanitizeEntity } = require('@strapi/utils');
const { getService } = require('../utils');
const validateSettings = require('./validation/settings');
const validateUploadBody = require('./validation/upload');

const sanitize = (data, options = {}) => {
  return sanitizeEntity(data, {
    model: strapi.getModel('plugin::upload.file'),
    ...options,
  });
};

module.exports = {
  async find(ctx) {
    const files = await getService('upload').fetchAll(ctx.query);

    ctx.body = sanitize(files);
  },

  async findOne(ctx) {
    const {
      params: { id },
    } = ctx;

    const file = await getService('upload').findOne(id);

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    ctx.body = sanitize(file);
  },

  async count(ctx) {
    ctx.body = await getService('upload').count(ctx.query);
  },

  async destroy(ctx) {
    const {
      params: { id },
    } = ctx;

    const file = await getService('upload').findOne(id);

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    await getService('upload').remove(file);

    ctx.body = sanitize(file);
  },

  async updateSettings(ctx) {
    const {
      request: { body },
    } = ctx;

    const data = await validateSettings(body);

    await getService('upload').setSettings(data);

    ctx.body = { data };
  },

  async getSettings(ctx) {
    const data = await getService('upload').getSettings();

    ctx.body = { data };
  },

  async updateFileInfo(ctx) {
    const {
      query: { id },
      request: { body },
    } = ctx;
    const data = await validateUploadBody(body);

    const result = await getService('upload').updateFileInfo(id, data.fileInfo);

    ctx.body = sanitize(result);
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

    const replacedFiles = await getService('upload').replace(id, {
      data: await validateUploadBody(body),
      file: files,
    });

    ctx.body = sanitize(replacedFiles);
  },

  async uploadFiles(ctx) {
    const {
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadedFiles = await getService('upload').upload({
      data: await validateUploadBody(body),
      files,
    });

    ctx.body = sanitize(uploadedFiles);
  },

  async upload(ctx) {
    const {
      query: { id },
      request: { files: { files } = {} },
    } = ctx;

    if (id && (_.isEmpty(files) || files.size === 0)) {
      return this.updateFileInfo(ctx);
    }

    if (_.isEmpty(files) || files.size === 0) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: 'Upload.status.empty', message: 'Files are empty' }],
      });
    }

    await (id ? this.replaceFile : this.uploadFiles)(ctx);
  },

  async search(ctx) {
    const { id } = ctx.params;
    const model = strapi.getModel('plugin::upload.file');
    const entries = await strapi.query('plugin::upload.file').findMany({
      where: {
        $or: [{ hash: { $contains: id } }, { name: { $contains: id } }],
      },
    });

    ctx.body = sanitizeEntity(entries, { model });
  },
};
