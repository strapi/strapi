'use strict';

/**
 * Upload.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');
const toArray = require('stream-to-array');
const filenamify = require('filenamify');

const randomSuffix = () => crypto.randomBytes(5).toString('hex');
const generateFileName = name => {
  const baseName = filenamify(name, { replacement: '_' }).replace(/\s/g, '_');

  return `${baseName}_${randomSuffix()}`;
};

module.exports = {
  formatFileInfo({ filename, type, size }, fileInfo = {}, metas = {}) {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);

    const usedName = fileInfo.name || baseName;

    const entity = {
      name: usedName,
      alternativeText: fileInfo.alternativeText,
      caption: fileInfo.caption,
      // sha256: niceHash(buffer),
      hash: generateFileName(usedName),
      ext,
      mime: type,
      size: Math.round((size / 1000) * 100) / 100,
    };

    const { refId, ref, source, field } = metas;

    if (refId && ref && field) {
      entity.related = [
        {
          refId,
          ref,
          source,
          field,
        },
      ];
    }

    if (metas.path) {
      entity.path = metas.path;
    }

    return entity;
  },

  async enhanceFile(file, fileInfo, metas) {
    const parts = await toArray(fs.createReadStream(file.path));
    const buffers = parts.map(part => (_.isBuffer(part) ? part : Buffer.from(part)));

    const buffer = Buffer.concat(buffers);

    const formattedFile = this.formatFileInfo(
      {
        filename: file.name,
        type: file.type,
        size: file.size,
      },
      fileInfo,
      metas
    );

    return _.assign(formattedFile, {
      buffer,
    });
  },

  async upload(files) {
    const config = strapi.plugins.upload.config;

    // upload a single file
    const uploadFile = async file => {
      await strapi.plugins.upload.provider.upload(file);

      delete file.buffer;
      file.provider = config.provider;

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

    // execute delete function of the provider
    if (file.provider === config.provider) {
      await strapi.plugins.upload.provider.delete(file);
    }

    const media = await strapi.query('file', 'upload').findOne({
      id: file.id,
    });

    strapi.eventHub.emit('media.delete', { media });

    return strapi.query('file', 'upload').delete({ id: file.id });
  },

  async uploadToEntity(params, files, source) {
    const { id, model, field } = params;

    const arr = Array.isArray(files) ? files : [files];
    return Promise.all(
      arr.map(file => {
        return this.enhanceFile(
          file,
          {},
          {
            refId: id,
            ref: model,
            source,
            field,
          }
        );
      })
    ).then(files => this.upload(files));
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
