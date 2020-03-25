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
const util = require('util');
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
    const readBuffer = await util.promisify(fs.readFile)(file.path);

    const { optimize } = strapi.plugins.upload.services['image-manipulation'];

    const { buffer, info } = await optimize(readBuffer);

    const formattedFile = this.formatFileInfo(
      {
        filename: file.name,
        type: file.type,
        size: file.size,
      },
      fileInfo,
      metas
    );

    return _.assign(formattedFile, info, {
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

    const {
      getDimensions,
      generateThumbnail,
      generateResponsiveFormats,
    } = strapi.plugins.upload.services['image-manipulation'];

    await strapi.plugins.upload.provider.upload(fileData);

    const thumbnailFile = await generateThumbnail(fileData);
    if (thumbnailFile) {
      await strapi.plugins.upload.provider.upload(thumbnailFile);
      delete thumbnailFile.buffer;
      _.set(fileData, 'formats.thumbnail', thumbnailFile);
    }

    const formats = await generateResponsiveFormats(fileData);
    if (Array.isArray(formats) && formats.length > 0) {
      for (const format of formats) {
        if (!format) continue;

        const { key, file } = format;

        await strapi.plugins.upload.provider.upload(file);
        delete file.buffer;

        _.set(fileData, ['formats', key], file);
      }
    }

    const { width, height } = await getDimensions(fileData.buffer);

    delete fileData.buffer;

    _.assign(fileData, {
      provider: config.provider,
      width,
      height,
    });

    return this.add(fileData);
  },

  async updateFileInfo(id, { name, alternativeText, caption }) {
    const dbFile = await this.fetch({ id });

    if (!dbFile) {
      throw strapi.errors.notFound('file not found');
    }

    const newInfos = _.assign({}, dbFile, {
      name: _.isNil(name) ? dbFile.name : name,
      alternativeText: _.isNil(alternativeText) ? dbFile.alternativeText : alternativeText,
      caption: _.isNil(caption) ? dbFile.caption : caption,
    });

    return this.update({ id }, newInfos);
  },

  async replace(id, { data, file }) {
    const config = strapi.plugins.upload.config;

    const {
      getDimensions,
      generateThumbnail,
      generateResponsiveFormats,
    } = strapi.plugins.upload.services['image-manipulation'];

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

      if (dbFile.formats) {
        await Promise.all(
          Object.keys(dbFile.formats).map(key => {
            return strapi.plugins.upload.provider.delete(dbFile.formats[key]);
          })
        );
      }
    }

    await strapi.plugins.upload.provider.upload(fileData);

    const thumbnailFile = await generateThumbnail(fileData);
    if (thumbnailFile) {
      await strapi.plugins.upload.provider.upload(thumbnailFile);
      delete thumbnailFile.buffer;
      _.set(fileData, 'formats.thumbnail', thumbnailFile);
    }

    const formats = await generateResponsiveFormats(fileData);
    if (Array.isArray(formats) && formats.length > 0) {
      for (const format of formats) {
        if (!format) continue;

        const { key, file } = format;

        await strapi.plugins.upload.provider.upload(file);
        delete file.buffer;

        _.set(fileData, ['formats', key], file);
      }
    }

    const { width, height } = await getDimensions(fileData.buffer);
    delete fileData.buffer;

    _.assign(fileData, {
      provider: config.provider,
      width,
      height,
    });

    return this.update({ id }, fileData);
  },

  async update(params, values) {
    const res = await strapi.query('file', 'upload').update(params, values);
    strapi.eventHub.emit('media.update', { media: res });
    return res;
  },

  async add(values) {
    const res = await strapi.query('file', 'upload').create(values);
    strapi.eventHub.emit('media.create', { media: res });
    return res;
  },

  fetch(params) {
    return strapi.query('file', 'upload').findOne(params);
  },

  fetchAll(params) {
    // FIXME: until we support boolean operators for querying we need to make mime_ncontains use AND instead of OR
    if (_.has(params, 'mime_ncontains') && Array.isArray(params.mime_ncontains)) {
      params._where = params.mime_ncontains.map(val => ({ mime_ncontains: val }));
      delete params.mime_ncontains;
    }

    return strapi.query('file', 'upload').find(params);
  },

  search(params) {
    return strapi.query('file', 'upload').search(params);
  },

  countSearch(params) {
    return strapi.query('file', 'upload').countSearch(params);
  },

  count(params) {
    return strapi.query('file', 'upload').count(params);
  },

  async remove(file) {
    const config = strapi.plugins.upload.config;

    // execute delete function of the provider
    if (file.provider === config.provider) {
      await strapi.plugins.upload.provider.delete(file);

      if (file.formats) {
        await Promise.all(
          Object.keys(file.formats).map(key => {
            return strapi.plugins.upload.provider.delete(file.formats[key]);
          })
        );
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
    const enhancedFiles = await Promise.all(
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
    );

    await Promise.all(enhancedFiles.map(file => this.uploadFileAndPersist(file)));
  },

  getSettings() {
    return strapi
      .store({
        type: 'plugin',
        name: 'upload',
        key: 'settings',
      })
      .get();
  },

  setSettings(value) {
    return strapi
      .store({
        type: 'plugin',
        name: 'upload',
        key: 'settings',
      })
      .set({ value });
  },
};
