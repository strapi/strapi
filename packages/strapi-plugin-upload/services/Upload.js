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
const { bytesToKbytes } = require('../utils/file');

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
      size: bytesToKbytes(size),
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

  async enhanceFile(file, fileInfo = {}, metas = {}) {
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

  async upload({ data, files }) {
    const { fileInfo, ...metas } = data;

    const fileArray = Array.isArray(files) ? files : [files];
    const fileInfoArray = Array.isArray(fileInfo) ? fileInfo : [fileInfo];

    const doUpload = async (file, fileInfo) => {
      const fileData = await this.enhanceFile(file, fileInfo, metas);

      return this.uploadFileAndPersist(fileData);
    };

    return await Promise.all(
      fileArray.map((file, idx) => doUpload(file, fileInfoArray[idx] || {}))
    );
  },

  async uploadFileAndPersist(fileData) {
    const config = strapi.plugins.upload.config;

    const { getDimensions, generateThumbnail } = strapi.plugins.upload.services[
      'image-manipulation'
    ];

    await strapi.plugins.upload.provider.upload(fileData);

    const thumbnailFile = await generateThumbnail(fileData);
    if (thumbnailFile) {
      await strapi.plugins.upload.provider.upload(thumbnailFile);
      delete thumbnailFile.buffer;
      _.set(fileData, 'formats.thumbnail', thumbnailFile);
    }

    const { width, height } = await getDimensions(fileData.buffer);

    delete fileData.buffer;

    _.assign(fileData, {
      provider: config.provider,
      width,
      height,
    });

    const res = await this.add(fileData);

    strapi.eventHub.emit('media.create', { media: res });
    return res;
  },

  async replace(id, { data, file }) {
    const config = strapi.plugins.upload.config;

    const { getDimensions, generateThumbnail } = strapi.plugins.upload.services[
      'image-manipulation'
    ];

    const dbFile = await this.fetch({ id });

    if (!dbFile) {
      throw strapi.errors.notFound('file not found');
    }

    const { fileInfo } = data;
    const fileData = await this.enhanceFile(file, fileInfo);

    // keep a constant hash
    _.assign(fileData, {
      hash: dbFile.hash,
      ext: dbFile.ext,
    });

    // execute delete function of the provider
    if (dbFile.provider === config.provider) {
      await strapi.plugins.upload.provider.delete(dbFile);

      if (_.has(dbFile, 'formats.thumbnail')) {
        await strapi.plugins.upload.provider.delete(_.get(dbFile, 'formats.thumbnail'));
      }
    }

    await strapi.plugins.upload.provider.upload(fileData);

    const thumbnailFile = await generateThumbnail(fileData);
    if (thumbnailFile) {
      await strapi.plugins.upload.provider.upload(thumbnailFile);
      delete thumbnailFile.buffer;
      _.set(fileData, 'formats.thumbnail', thumbnailFile);
    }

    const { width, height } = await getDimensions(fileData.buffer);
    delete fileData.buffer;

    _.assign(fileData, {
      provider: config.provider,
      width,
      height,
    });

    const res = await this.update({ id }, fileData);
    strapi.eventHub.emit('media.update', { media: res });

    return res;
  },

  update(params, values) {
    return strapi.query('file', 'upload').update(params, values);
  },

  add(values) {
    return strapi.query('file', 'upload').create(values);
  },

  fetch(params) {
    return strapi.query('file', 'upload').findOne(params);
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

      if (_.has(file, 'formats.thumbnail')) {
        await strapi.plugins.upload.provider.delete(_.get(file, 'formats.thumbnail'));
      }
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
    ).then(files => this.uploadFileAndPersist(files));
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
