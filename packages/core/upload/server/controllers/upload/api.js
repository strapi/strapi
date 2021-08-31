'use strict';

const { sanitizeEntity } = require('@strapi/utils');
const validateSettings = require('../validation/settings');
const validateUploadBody = require('../validation/upload');
const { getService } = require('../../utils');

const sanitize = (data, options = {}) => {
  return sanitizeEntity(data, {
    model: strapi.getModel('file', 'upload'),
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

    const file = await getService('upload').findOne({ id });

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

    const file = await getService('upload').findOne({ id });

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
};
