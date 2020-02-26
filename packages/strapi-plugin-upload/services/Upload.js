'use strict';

/**
 * Upload.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const fs = require('fs');
const crypto = require('crypto');
const _ = require('lodash');
const toArray = require('stream-to-array');
const uuid = require('uuid/v4');

function niceHash(buffer) {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\//g, '-')
    .replace(/\+/, '_');
}

module.exports = {
  bufferize: async files => {
    if (_.isEmpty(files) === 0) {
      throw 'Missing files.';
    }

    // files is always an array to map on
    files = _.isArray(files) ? files : [files];

    const createBuffer = async stream => {
      const parts = await toArray(fs.createReadStream(stream.path));
      const buffers = parts.map(part =>
        _.isBuffer(part) ? part : Buffer.from(part)
      );

      const buffer = Buffer.concat(buffers);

      return {
        tmpPath: stream.path,
        name: stream.name,
        sha256: niceHash(buffer),
        hash: uuid().replace(/-/g, ''),
        ext:
          stream.name.split('.').length > 1
            ? `.${_.last(stream.name.split('.'))}`
            : '',
        buffer,
        mime: stream.type,
        size: Math.round((stream.size / 1000) * 100) / 100,
      };
    };

    // transform all files in buffer
    return Promise.all(files.map(stream => createBuffer(stream)));
  },

  async upload(files) {
    const config = strapi.plugins.upload.config;

    // Get upload provider settings to configure the provider to use.
    const provider = _.find(strapi.plugins.upload.config.providers, {
      provider: config.provider,
    });

    if (!provider) {
      throw new Error(
        `The provider package isn't installed. Please run \`npm install strapi-provider-upload-${config.provider}\``
      );
    }

    const actions = await provider.init(config.providerOptions);

    // upload a single file
    const uploadFile = async file => {
      await actions.upload(file);

      delete file.buffer;
      file.provider = provider.provider;

      const res = await this.add(file);

      strapi.eventHub.emit('media.create', { media: res });
      return res;
    };

    // Execute upload function of the provider for all files.
    return Promise.all(files.map(file => uploadFile(file)));
  },

  add(values) {
    return strapi.query('file', 'upload').create(values);
  },

  fetch(params) {
    return strapi.query('file', 'upload').findOne({
      id: params.id,
    });
  },

  fetchAll(params) {
    return strapi.query('file', 'upload').find(params);
  },

  count(params) {
    return strapi.query('file', 'upload').count(params);
  },

  async remove(file) {
    const config = strapi.plugins.upload.config;

    // get upload provider settings to configure the provider to use
    const provider = _.find(strapi.plugins.upload.config.providers, {
      provider: config.provider,
    });

    const actions = provider.init(config.providerOptions);

    // execute delete function of the provider
    if (file.provider === config.provider) {
      await actions.delete(file);
    }

    const media = await strapi.query('file', 'upload').findOne({
      id: file.id,
    });

    strapi.eventHub.emit('media.delete', { media });

    return strapi.query('file', 'upload').delete({ id: file.id });
  },

  async uploadToEntity(params, files, source) {
    const model = strapi.getModel(params.model, source);

    // Asynchronous upload.
    return await Promise.all(
      Object.keys(files).map(async attribute => {
        // Bufferize files per attribute.
        const buffers = await this.bufferize(files[attribute]);
        const enhancedFiles = buffers.map(file => {
          const details = model.attributes[attribute];

          // Add related information to be able to make
          // the relationships later.
          file[details.via] = [
            {
              refId: params.id,
              ref: params.model,
              source,
              field: attribute,
            },
          ];

          return file;
        });

        // Make upload async.
        return this.upload(enhancedFiles);
      })
    );
  },
  async getConfig() {
    const config = await strapi
      .store({
        environment: strapi.config.environment,
        type: 'plugin',
        name: 'upload',
      })
      .get({ key: 'provider' });

    return { ...config, sizeLimit: parseFloat(config.sizeLimit) };
  },
};
