'use strict';

const _ = require('lodash');
const utils = require('@strapi/utils');
const { getService } = require('../utils');
const { FILE_MODEL_UID } = require('../constants');
const validateUploadBody = require('./validation/content-api/upload');

const { sanitize } = utils;
const { ValidationError } = utils.errors;

const sanitizeOutput = (data, ctx) => {
  const schema = strapi.getModel(FILE_MODEL_UID);
  const { auth } = ctx.state;

  return sanitize.contentAPI.output(data, schema, { auth });
};

module.exports = {
  async find(ctx) {
    const files = await getService('upload').findMany(ctx.query);

    ctx.body = await sanitizeOutput(files, ctx);
  },

  async findOne(ctx) {
    const {
      params: { id },
    } = ctx;

    const file = await getService('upload').findOne(id);

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    ctx.body = await sanitizeOutput(file, ctx);
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

    ctx.body = await sanitizeOutput(file, ctx);
  },

  async updateFileInfo(ctx) {
    const {
      query: { id },
      request: { body },
    } = ctx;
    const data = await validateUploadBody(body);

    const result = await getService('upload').updateFileInfo(id, data.fileInfo);

    ctx.body = await sanitizeOutput(result, ctx);
  },

  async replaceFile(ctx) {
    const {
      query: { id },
      request: { body, files: { files } = {} },
    } = ctx;

    // cannot replace with more than one file
    if (Array.isArray(files)) {
      throw new ValidationError('Cannot replace a file with multiple ones');
    }

    const replacedFiles = await getService('upload').replace(id, {
      data: await validateUploadBody(body),
      file: files,
    });

    ctx.body = await sanitizeOutput(replacedFiles, ctx);
  },

  async uploadFiles(ctx) {
    const {
      request: { body, files: { files } = {} },
    } = ctx;

    const data = await validateUploadBody(body);

    const apiUploadFolderService = getService('api-upload-folder');

    const apiUploadFolder = await apiUploadFolderService.getAPIUploadFolder();
    data.fileInfo = data.fileInfo || {};
    data.fileInfo = Array.isArray(data.fileInfo) ? data.fileInfo : [data.fileInfo];
    data.fileInfo.forEach(fileInfo => (fileInfo.folder = apiUploadFolder.id));

    const uploadedFiles = await getService('upload').upload({
      data,
      files,
    });

    ctx.body = await sanitizeOutput(uploadedFiles, ctx);
  },

  async upload(ctx) {
    const {
      query: { id },
      request: { files: { files } = {} },
    } = ctx;

    if (_.isEmpty(files) || files.size === 0) {
      if (id) {
        return this.updateFileInfo(ctx);
      }

      throw new ValidationError('Files are empty');
    }

    await (id ? this.replaceFile : this.uploadFiles)(ctx);
  },
};
