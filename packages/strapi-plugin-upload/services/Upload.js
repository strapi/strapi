'use strict';

/**
 * Upload.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const toArray = require('stream-to-array');
const uuid = require('uuid/v4');

module.exports = {
  buffurize: async values => {
    if (_.size(values.files) === 0) {
      throw 'Missing files.';
    }

    const files = _.isArray(values.files) ? values.files : [values.files];

    return Promise.all(
      files.map(async stream => {
        const parts = await toArray(fs.createReadStream(stream.path));
        const buffers = parts.map(
          part => _.isBuffer(part) ? part : Buffer.from(part)
        );

        return {
          name: stream.name,
          hash: uuid().replace(/-/g, ''),
          ext: _.last(stream.name.split('.')),
          buffer: Buffer.concat(buffers),
          mime: stream.type,
          size: `${(stream.size / 1000).toFixed(2)} KB`
        };
      })
    );
  },

  upload: async (files, config) => {
    const provider = _.cloneDeep(_.find(strapi.plugins.upload.config.providers, {provider: config.provider}));
    _.assign(provider, config);
    const actions = provider.init(strapi, config);

    return Promise.all(
      files.map(async file => {
        await actions.upload(file);

        delete file.buffer;

        await strapi.plugins['upload'].services.upload.add(file);
      })
    );
  },

  add: async (values) => {
    // Use Content Manager business logic to handle relation.
    if (strapi.plugins['content-manager']) {
      return await strapi.plugins['content-manager'].services['contentmanager'].add({
        model: 'file'
      }, values, 'upload');
    }

    return strapi.query('file', 'upload').create(values);
  },

  edit: async (params, values) => {
    // Use Content Manager business logic to handle relation.
    if (strapi.plugins['content-manager']) {
      params.model = 'file';
      params.id = (params._id || params.id);

      return await strapi.plugins['content-manager'].services['contentmanager'].edit(params, values, 'upload');
    }

    return strapi.query('file', 'upload').update(_.assign(params, values));
  },

  fetch: (params) => {
    return strapi.query('file', 'upload').findOne(_.pick(params, ['_id', 'id']));
  },

  fetchAll: (params) => {
    return strapi.query('file', 'upload').find(strapi.utils.models.convertParams('file', params));
  },

  count: async (params, source) => {
    return await strapi.query('file', 'upload').count();
  },

  remove: async (params, config) => {
    const file = await strapi.plugins['upload'].services.upload.fetch(params);

    const provider = _.cloneDeep(_.find(strapi.plugins.upload.config.providers, {provider: config.provider}));
    _.assign(provider, config);
    const actions = provider.init(strapi, config);

    await actions.delete(file);

    // Use Content Manager business logic to handle relation.
    if (strapi.plugins['content-manager']) {
      params.model = 'file';
      params.id = (params._id || params.id);

      await strapi.plugins['content-manager'].services['contentmanager'].delete(params, {source: 'upload'});
    }

    return strapi.query('file', 'upload').delete(params);
  }
};
