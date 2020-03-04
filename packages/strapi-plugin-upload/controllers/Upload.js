'use strict';

/**
 * Upload.js controller
 *
 */

const _ = require('lodash');
const validateSettings = require('./validation/settings');
const { yup, formatYupErrors } = require('strapi-utils');

const fileInfoSchema = yup.object({
  name: yup.string().nullable(),
  alternativeText: yup.string().nullable(),
  caption: yup.string().nullable(),
});

const uploadSchema = yup.object({
  fileInfo: fileInfoSchema,
});

const multiUploadSchema = yup.object({
  fileInfo: yup.array().of(fileInfoSchema),
});

const validateUploadBody = (schema, data = {}) => {
  return schema.validate(data, { abortEarly: false }).catch(err => {
    throw strapi.errors.badRequest('ValidationError', { errors: formatYupErrors(err) });
  });
};

module.exports = {
  async upload(ctx) {
    const uploadService = strapi.plugins.upload.services.upload;

    // Retrieve provider configuration.
    const { enabled } = strapi.plugins.upload.config;

    // Verify if the file upload is enable.
    if (enabled === false) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: 'Upload.status.disabled', message: 'File upload is disabled' }],
      });
    }

    const files = _.get(ctx.request.files, 'files');

    if (_.isEmpty(files)) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: 'Upload.status.empty', message: 'Files are empty' }],
      });
    }

    let data;
    if (Array.isArray(files)) {
      data = await validateUploadBody(multiUploadSchema, ctx.request.body);
    } else {
      data = await validateUploadBody(uploadSchema, ctx.request.body);
    }

    const { refId, ref, source, field, path, fileInfo } = data;

    const fileArray = Array.isArray(files) ? files : [files];
    const fileInfoArray = Array.isArray(fileInfo) ? fileInfo : [fileInfo];

    // Transform stream files to buffer
    const enhancedFiles = await Promise.all(
      fileArray.map((file, idx) => {
        const fileInfo = fileInfoArray[idx] || {};

        return uploadService.enhanceFile(file, fileInfo, { refId, ref, source, field, path });
      })
    );

    const uploadedFiles = await uploadService.upload(enhancedFiles);

    // Send 200 `ok`
    ctx.send(uploadedFiles);
  },

  async getSettings(ctx) {
    const config = await strapi
      .store({
        type: 'plugin',
        name: 'upload',
        key: 'settings',
      })
      .get();

    ctx.send({
      data: config,
    });
  },

  async updateSettings(ctx) {
    const configurator = strapi.store({
      type: 'plugin',
      name: 'upload',
      key: 'settings',
    });

    const data = await validateSettings(ctx.request.body);

    await configurator.set({ key: 'settings', value: data });

    ctx.body = { data };
  },

  async replaceFile(ctx) {
    const { id } = ctx.params;

    const uploadService = strapi.plugins.upload.services.upload;

    // Retrieve provider configuration.
    const { enabled } = strapi.plugins.upload.config;

    // Verify if the file upload is enable.
    if (enabled === false) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: 'Upload.status.disabled', message: 'File upload is disabled' }],
      });
    }

    const data = await strapi.plugins['upload'].services.upload.fetch({ id });

    if (!data) {
      return ctx.notFound('file.notFound');
    }

    const { fileInfo } = await validateUploadBody(uploadSchema, ctx.request.body);

    const { file = {} } = ctx.request.files || {};

    if (_.isUndefined(file)) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: 'Upload.status.empty', message: 'File is missing' }],
      });
    }

    const enhancedFile = uploadService.enhanceFile(file, fileInfo);

    const updatedFile = await uploadService.update(id, enhancedFile);

    ctx.send(updatedFile);
  },

  async find(ctx) {
    const data = await strapi.plugins['upload'].services.upload.fetchAll(ctx.query);

    // Send 200 `ok`
    ctx.send(data);
  },

  async findOne(ctx) {
    const data = await strapi.plugins['upload'].services.upload.fetch(ctx.params);

    if (!data) {
      return ctx.notFound('file.notFound');
    }

    ctx.send(data);
  },

  async count(ctx) {
    const data = await strapi.plugins['upload'].services.upload.count(ctx.query);

    ctx.send({ count: data });
  },

  async destroy(ctx) {
    const { id } = ctx.params;

    const file = await strapi.plugins['upload'].services.upload.fetch({ id });

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    await strapi.plugins['upload'].services.upload.remove(file);

    ctx.send(file);
  },

  async search(ctx) {
    const { id } = ctx.params;

    const data = await strapi.query('file', 'upload').custom(searchQueries)({
      id,
    });

    ctx.send(data);
  },
};

const searchQueries = {
  bookshelf({ model }) {
    return ({ id }) => {
      return model
        .query(qb => {
          qb.whereRaw('LOWER(hash) LIKE ?', [`%${id}%`]).orWhereRaw('LOWER(name) LIKE ?', [
            `%${id}%`,
          ]);
        })
        .fetchAll()
        .then(results => results.toJSON());
    };
  },
  mongoose({ model }) {
    return ({ id }) => {
      const re = new RegExp(id, 'i');

      return model
        .find({
          $or: [{ hash: re }, { name: re }],
        })
        .lean();
    };
  },
};
