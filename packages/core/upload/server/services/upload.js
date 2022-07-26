'use strict';

/**
 * Upload.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const os = require('os');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const {
  sanitize,
  nameToSlug,
  contentTypes: contentTypesUtils,
  webhook: webhookUtils,
} = require('@strapi/utils');
const { NotFoundError } = require('@strapi/utils').errors;

const { MEDIA_UPDATE, MEDIA_CREATE, MEDIA_DELETE } = webhookUtils.webhookEvents;

const { getService } = require('../utils');
const { bytesToKbytes } = require('../utils/file');

const { UPDATED_BY_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

const randomSuffix = () => crypto.randomBytes(5).toString('hex');

const generateFileName = name => {
  const baseName = nameToSlug(name, { separator: '_', lowercase: false });

  return `${baseName}_${randomSuffix()}`;
};

const sendMediaMetrics = data => {
  if (_.has(data, 'caption') && !_.isEmpty(data.caption)) {
    strapi.telemetry.send('didSaveMediaWithCaption');
  }

  if (_.has(data, 'alternativeText') && !_.isEmpty(data.alternativeText)) {
    strapi.telemetry.send('didSaveMediaWithAlternativeText');
  }
};

const createAndAssignTmpWorkingDirectoryToFiles = async files => {
  const tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-upload-'));

  Array.isArray(files)
    ? files.forEach(file => (file.tmpWorkingDirectory = tmpWorkingDirectory))
    : (files.tmpWorkingDirectory = tmpWorkingDirectory);

  return tmpWorkingDirectory;
};

module.exports = ({ strapi }) => ({
  async emitEvent(event, data) {
    const modelDef = strapi.getModel('plugin::upload.file');
    const sanitizedData = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, data);

    strapi.eventHub.emit(event, { media: sanitizedData });
  },

  async formatFileInfo({ filename, type, size }, fileInfo = {}, metas = {}) {
    const ext = path.extname(filename);
    const basename = path.basename(fileInfo.name || filename, ext);

    const usedName = fileInfo.name || filename;

    const entity = {
      name: usedName,
      alternativeText: fileInfo.alternativeText,
      caption: fileInfo.caption,
      hash: (await getService('provider').generateFileName(basename)) || generateFileName(basename),
      ext,
      mime: type,
      size: bytesToKbytes(size),
    };

    const { refId, ref, field } = metas;

    if (refId && ref && field) {
      entity.related = [
        {
          id: refId,
          __type: ref,
          __pivot: { field },
        },
      ];
    }

    if (metas.path) {
      entity.path = metas.path;
    }

    if (metas.tmpWorkingDirectory) {
      entity.tmpWorkingDirectory = metas.tmpWorkingDirectory;
    }

    return entity;
  },

  async enhanceFile(file, fileInfo = {}, metas = {}) {
    const currentFile = await this.formatFileInfo(
      {
        filename: file.name,
        type: file.type,
        size: file.size,
      },
      fileInfo,
      {
        ...metas,
        tmpWorkingDirectory: file.tmpWorkingDirectory,
      }
    );
    currentFile.getStream = () => fs.createReadStream(file.path);

    const { optimize, isOptimizableImage } = strapi.plugin('upload').service('image-manipulation');

    if (!(await isOptimizableImage(currentFile))) {
      return currentFile;
    }

    return optimize(currentFile);
  },

  async upload({ data, files }, { user } = {}) {
    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(files);

    let uploadedFiles = [];

    try {
      const { fileInfo, ...metas } = data;

      const fileArray = Array.isArray(files) ? files : [files];
      const fileInfoArray = Array.isArray(fileInfo) ? fileInfo : [fileInfo];

      const doUpload = async (file, fileInfo) => {
        const fileData = await this.enhanceFile(file, fileInfo, metas);

        return this.uploadFileAndPersist(fileData, { user });
      };

      uploadedFiles = await Promise.all(
        fileArray.map((file, idx) => doUpload(file, fileInfoArray[idx] || {}))
      );
    } finally {
      // delete temporary folder
      await fse.remove(tmpWorkingDirectory);
    }

    return uploadedFiles;
  },

  async uploadFileAndPersist(fileData, { user } = {}) {
    const config = strapi.config.get('plugin.upload');

    const {
      getDimensions,
      generateThumbnail,
      generateResponsiveFormats,
      isImage,
      isOptimizableImage,
    } = getService('image-manipulation');
    await getService('provider').upload(fileData);

    if (await isImage(fileData)) {
      if (await isOptimizableImage(fileData)) {
        const thumbnailFile = await generateThumbnail(fileData);
        if (thumbnailFile) {
          await getService('provider').upload(thumbnailFile);
          _.set(fileData, 'formats.thumbnail', thumbnailFile);
        }

        const formats = await generateResponsiveFormats(fileData);
        if (Array.isArray(formats) && formats.length > 0) {
          for (const format of formats) {
            if (!format) continue;

            const { key, file } = format;

            await getService('provider').upload(file);

            _.set(fileData, ['formats', key], file);
          }
        }
      }

      const { width, height } = await getDimensions(fileData);

      _.assign(fileData, {
        width,
        height,
      });
    }

    _.set(fileData, 'provider', config.provider);

    return this.add(fileData, { user });
  },

  async updateFileInfo(id, { name, alternativeText, caption }, { user } = {}) {
    const dbFile = await this.findOne(id);

    if (!dbFile) {
      throw new NotFoundError();
    }

    const newInfos = {
      name: _.isNil(name) ? dbFile.name : name,
      alternativeText: _.isNil(alternativeText) ? dbFile.alternativeText : alternativeText,
      caption: _.isNil(caption) ? dbFile.caption : caption,
    };

    return this.update(id, newInfos, { user });
  },

  async replace(id, { data, file }, { user } = {}) {
    const config = strapi.config.get('plugin.upload');

    const { getDimensions, generateThumbnail, generateResponsiveFormats } = getService(
      'image-manipulation'
    );

    const dbFile = await this.findOne(id);

    if (!dbFile) {
      throw new NotFoundError();
    }

    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(file);

    let fileData;

    try {
      const { fileInfo } = data;
      fileData = await this.enhanceFile(file, fileInfo);

      // keep a constant hash
      _.assign(fileData, {
        hash: dbFile.hash,
        ext: dbFile.ext,
      });

      // execute delete function of the provider
      if (dbFile.provider === config.provider) {
        await strapi.plugin('upload').provider.delete(dbFile);

        if (dbFile.formats) {
          await Promise.all(
            Object.keys(dbFile.formats).map(key => {
              return strapi.plugin('upload').provider.delete(dbFile.formats[key]);
            })
          );
        }
      }

      await getService('provider').upload(fileData);

      // clear old formats
      _.set(fileData, 'formats', {});

      const { isImage, isOptimizableImage } = getService('image-manipulation');

      if (await isImage(fileData)) {
        if (await isOptimizableImage(fileData)) {
          const thumbnailFile = await generateThumbnail(fileData);
          if (thumbnailFile) {
            await getService('provider').upload(thumbnailFile);
            _.set(fileData, 'formats.thumbnail', thumbnailFile);
          }

          const formats = await generateResponsiveFormats(fileData);
          if (Array.isArray(formats) && formats.length > 0) {
            for (const format of formats) {
              if (!format) continue;

              const { key, file } = format;

              await getService('provider').upload(file);

              _.set(fileData, ['formats', key], file);
            }
          }
        }

        const { width, height } = await getDimensions(fileData);

        _.assign(fileData, {
          width,
          height,
        });
      }
      _.set(fileData, 'provider', config.provider);
    } finally {
      // delete temporary folder
      await fse.remove(tmpWorkingDirectory);
    }

    return this.update(id, fileData, { user });
  },

  async update(id, values, { user } = {}) {
    const fileValues = { ...values };
    if (user) {
      fileValues[UPDATED_BY_ATTRIBUTE] = user.id;
    }
    sendMediaMetrics(fileValues);

    const res = await strapi.entityService.update('plugin::upload.file', id, { data: fileValues });

    await this.emitEvent(MEDIA_UPDATE, res);

    return res;
  },

  async add(values, { user } = {}) {
    const fileValues = { ...values };
    if (user) {
      fileValues[UPDATED_BY_ATTRIBUTE] = user.id;
      fileValues[CREATED_BY_ATTRIBUTE] = user.id;
    }
    sendMediaMetrics(fileValues);

    const res = await strapi.query('plugin::upload.file').create({ data: fileValues });

    await this.emitEvent(MEDIA_CREATE, res);

    return res;
  },

  findOne(id, populate) {
    return strapi.entityService.findOne('plugin::upload.file', id, { populate });
  },

  findMany(query) {
    return strapi.entityService.findMany('plugin::upload.file', query);
  },

  findPage(query) {
    return strapi.entityService.findPage('plugin::upload.file', query);
  },

  async remove(file) {
    const config = strapi.config.get('plugin.upload');

    // execute delete function of the provider
    if (file.provider === config.provider) {
      await strapi.plugin('upload').provider.delete(file);

      if (file.formats) {
        await Promise.all(
          Object.keys(file.formats).map(key => {
            return strapi.plugin('upload').provider.delete(file.formats[key]);
          })
        );
      }
    }

    const media = await strapi.query('plugin::upload.file').findOne({
      where: { id: file.id },
    });

    await this.emitEvent(MEDIA_DELETE, media);

    return strapi.query('plugin::upload.file').delete({ where: { id: file.id } });
  },

  async uploadToEntity(params, files) {
    const { id, model, field } = params;

    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(files);

    const arr = Array.isArray(files) ? files : [files];

    try {
      const enhancedFiles = await Promise.all(
        arr.map(file => {
          return this.enhanceFile(
            file,
            {},
            {
              refId: id,
              ref: model,
              field,
            }
          );
        })
      );

      await Promise.all(enhancedFiles.map(file => this.uploadFileAndPersist(file)));
    } finally {
      // delete temporary folder
      await fse.remove(tmpWorkingDirectory);
    }
  },

  getSettings() {
    return strapi.store({ type: 'plugin', name: 'upload', key: 'settings' }).get();
  },

  setSettings(value) {
    if (value.responsiveDimensions === true) {
      strapi.telemetry.send('didEnableResponsiveDimensions');
    } else {
      strapi.telemetry.send('didDisableResponsiveDimensions');
    }

    return strapi.store({ type: 'plugin', name: 'upload', key: 'settings' }).set({ value });
  },
});
