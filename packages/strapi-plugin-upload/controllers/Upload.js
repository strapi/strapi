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

const isUploadDisabled = () => _.get(strapi.plugins, 'upload.config.enabled', true) === false;

const disabledPluginError = () =>
  strapi.errors.badRequest(null, {
    errors: [{ id: 'Upload.status.disabled', message: 'File upload is disabled' }],
  });

const emptyFileError = () =>
  strapi.errors.badRequest(null, {
    errors: [{ id: 'Upload.status.empty', message: 'Files are empty' }],
  });

// Assign created_by and updated_by on medias
const setCreatorInfo = (ctx, files, { edition = false } = {}) => {
  if (!Array.isArray(files)) files = [files];

  return Promise.all(
    files.map(file => {
      if (ctx.state.isAuthenticatedAdmin) {
        if (edition) {
          return strapi.query('file', 'upload').update(
            { id: file.id },
            {
              updated_by: ctx.state.user.id,
            }
          );
        }

        return strapi.query('file', 'upload').update(
          { id: file.id },
          {
            created_by: ctx.state.user.id,
            updated_by: ctx.state.user.id,
          }
        );
      }
    })
  );
};

module.exports = {
  async upload(ctx) {
    if (isUploadDisabled()) {
      throw disabledPluginError();
    }

    const { id } = ctx.query;
    const files = _.get(ctx.request.files, 'files');

    // update only fileInfo if not file content sent
    if (id && (_.isEmpty(files) || files.size === 0)) {
      const data = await validateUploadBody(uploadSchema, ctx.request.body);

      const file = await strapi.plugins.upload.services.upload.updateFileInfo(id, data.fileInfo);

      await setCreatorInfo(ctx, file, { edition: true });
      return (ctx.body = file);
    }

    if (_.isEmpty(files) || files.size === 0) {
      throw emptyFileError();
    }

    const uploadService = strapi.plugins.upload.services.upload;

    const validationSchema = Array.isArray(files) ? multiUploadSchema : uploadSchema;
    const data = await validateUploadBody(validationSchema, ctx.request.body);

    if (id) {
      // cannot replace with more than one file
      if (Array.isArray(files)) {
        throw strapi.errors.badRequest(null, {
          errors: [
            { id: 'Upload.replace.single', message: 'Cannot replace a file with multiple ones' },
          ],
        });
      }

      const file = await uploadService.replace(id, { data, file: files });
      await setCreatorInfo(ctx, file, { edition: true });
      ctx.body = file;
    } else {
      const file = await uploadService.upload({ data, files });
      await setCreatorInfo(ctx, file);
      ctx.body = file;
    }
  },

  async getSettings(ctx) {
    const data = await strapi.plugins.upload.services.upload.getSettings();

    ctx.body = { data };
  },

  async updateSettings(ctx) {
    const data = await validateSettings(ctx.request.body);

    await strapi.plugins.upload.services.upload.setSettings(data);

    ctx.body = { data };
  },

  async find(ctx) {
    if (ctx.query._q) {
      ctx.body = await strapi.plugins['upload'].services.upload.search(ctx.query);
    } else {
      ctx.body = await strapi.plugins['upload'].services.upload.fetchAll(ctx.query);
    }
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const data = await strapi.plugins['upload'].services.upload.fetch({ id });

    if (!data) {
      return ctx.notFound('file.notFound');
    }

    ctx.body = data;
  },

  async count(ctx) {
    let count;
    if (ctx.query._q) {
      count = await strapi.plugins['upload'].services.upload.countSearch(ctx.query);
    } else {
      count = await strapi.plugins['upload'].services.upload.count(ctx.query);
    }

    ctx.body = { count };
  },

  async destroy(ctx) {
    const { id } = ctx.params;

    const file = await strapi.plugins['upload'].services.upload.fetch({ id });

    if (!file) {
      return ctx.notFound('file.notFound');
    }

    await strapi.plugins['upload'].services.upload.remove(file);

    ctx.body = file;
  },

  async search(ctx) {
    const { id } = ctx.params;

    ctx.body = await strapi.query('file', 'upload').custom(searchQueries)({
      id,
    });
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
