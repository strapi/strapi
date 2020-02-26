'use strict';

/**
 * Upload.js controller
 *
 */

const _ = require('lodash');
const validateSettings = require('./validation/settings');

module.exports = {
  async upload(ctx) {
    const uploadService = strapi.plugins.upload.services.upload;

    // Retrieve provider configuration.
    const { enabled } = strapi.plugins.upload.config;

    // Verify if the file upload is enable.
    if (enabled === false) {
      throw strapi.errors.badRequest(null, {
        errors: [
          { id: 'Upload.status.disabled', message: 'File upload is disabled' },
        ],
      });
    }

    // Extract optional relational data.
    const { refId, ref, source, field, path } = ctx.request.body || {};
    const { files = {} } = ctx.request.files || {};

    if (_.isEmpty(files)) {
      throw strapi.errors.badRequest(null, {
        errors: [{ id: 'Upload.status.empty', message: 'Files are empty' }],
      });
    }

    // Transform stream files to buffer
    const buffers = await uploadService.bufferize(files);

    const enhancedFiles = buffers.map(file => {
      // Add details to the file to be able to create the relationships.
      if (refId && ref && field) {
        Object.assign(file, {
          related: [
            {
              refId,
              ref,
              source,
              field,
            },
          ],
        });
      }

      // Update uploading folder path for the file.
      if (path) {
        Object.assign(file, {
          path,
        });
      }

      return file;
    });

    // Something is wrong (size limit)...
    if (ctx.status === 400) {
      return;
    }

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

  async find(ctx) {
    const data = await strapi.plugins['upload'].services.upload.fetchAll(
      ctx.query
    );

    // Send 200 `ok`
    ctx.send(data);
  },

  async findOne(ctx) {
    const data = await strapi.plugins['upload'].services.upload.fetch(
      ctx.params
    );

    if (!data) {
      return ctx.notFound('file.notFound');
    }

    ctx.send(data);
  },

  async count(ctx) {
    const data = await strapi.plugins['upload'].services.upload.count(
      ctx.query
    );

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
          qb.whereRaw('LOWER(hash) LIKE ?', [
            `%${id}%`,
          ]).orWhereRaw('LOWER(name) LIKE ?', [`%${id}%`]);
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
