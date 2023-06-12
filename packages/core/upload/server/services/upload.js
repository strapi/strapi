'use strict';

/**
 * Upload.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const { pipe, castArray, zip } = require('lodash/fp');
const { extension } = require('mime-types');
const {
  sanitize,
  contentTypes: contentTypesUtils,
  errors: { NotFoundError },
  file: { bytesToKbytes },
  mapAsync,
} = require('@strapi/utils');
const { getFileType, generateFileName, withTempDirectory } = require('../utils/file');
const MediaBuilder = require('../utils/media-builder');
const { getService } = require('../utils');
// const {
//   metadata,
//   optimize,
//   autoRotate,
//   breakpoints,
//   thumbnail,
// } = require('../utils/media-builder/transforms/sharp');
// const throttle = require('../utils/media-builder/transforms/throttle');

const { FILE_MODEL_UID, ALLOWED_WEBHOOK_EVENTS } = require('../constants');

const { MEDIA_CREATE, MEDIA_UPDATE, MEDIA_DELETE } = ALLOWED_WEBHOOK_EVENTS;
const { UPDATED_BY_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

// const IMAGES_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff', 'gif', 'svg', 'avif'];
// const IMAGES_TO_RESIZE = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
// const IMAGES_TO_OPTIMIZE = ['jpeg', 'png', 'webp', 'tiff', 'avif'];

const mediaBuilder = MediaBuilder();
// .transformOn('image.metadata', IMAGES_TO_PROCESS, [metadata])
// .transformOn('image.throttle', ['jpg', 'jpeg'], [throttle])
// .transformOn('image.optimize', IMAGES_TO_OPTIMIZE, [optimize, autoRotate])
// .transformOn('image.breakpoints', IMAGES_TO_RESIZE, [breakpoints])
// .transformOn('image.thumbnail', IMAGES_TO_RESIZE, [thumbnail]);
// .transformOn('image.size', IMAGES_TO_PROCESS, [size])

module.exports = ({ strapi }) => ({
  /**
   * Builder to define transformations on files.
   * @experimental Could be changed in the future.
   */
  mediaBuilder,

  /**
   * Emit event on file creation/update/deletion.
   */
  async emitEvent(event, data) {
    const modelDef = strapi.getModel(FILE_MODEL_UID);
    const sanitizedData = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, data);
    strapi.eventHub.emit(event, { media: sanitizedData });
  },

  async formatFileInfo({ filename, type, size }, fileInfo = {}, metas = {}) {
    const ext = path.extname(filename) || `.${extension(type)}`;
    const name = (fileInfo.name || filename).normalize();
    const basename = path.basename(name, ext);
    const folderPath = await getService('file').getFolderPath(fileInfo.folder);

    const file = {
      name,
      alternativeText: fileInfo.alternativeText,
      caption: fileInfo.caption,
      folder: fileInfo.folder,
      folderPath,
      hash: generateFileName(basename),
      ext,
      mime: type,
      size: bytesToKbytes(size),
    };

    // Add related entity information
    const { refId, ref, field } = metas;
    if (refId && ref && field) {
      file.related = [{ id: refId, __type: ref, __pivot: { field } }];
    }

    // Add file path information
    if (metas.path) {
      file.path = metas.path;
    }

    if (metas.tmpWorkingDirectory) {
      file.tmpWorkingDirectory = metas.tmpWorkingDirectory;
    }

    return file;
  },

  /**
   * Adds properties needed to upload a file to a provider.
   */
  async formatUploadFile({ name: filename, type, size, path }, fileInfo = {}, metas = {}) {
    const file = await this.formatFileInfo({ filename, type, size }, fileInfo, metas);

    file.getStream = () => fs.createReadStream(path);
    file.type = await getFileType(file);
    file.provider = strapi.config.get('plugin.upload').provider;

    return file;
  },

  /**
   * Uploads a file and persists it in the database.
   */
  async upload({ data, files }, { user } = {}) {
    const { fileInfo, ...metas } = data;

    const filesAndInfo = zip(
      castArray(files),
      castArray(fileInfo).map((info) => info || {})
    );

    return withTempDirectory((tmpWorkingDirectory) => {
      const fileMetadata = { ...metas, tmpWorkingDirectory };

      const doUpload = async ([fileData, fileInfo]) => {
        const file = await this.formatUploadFile(fileData, fileInfo, fileMetadata);
        return this.uploadFileAndPersist(file, { user });
      };

      return mapAsync(filesAndInfo, doUpload);
    });
  },

  async uploadFileAndPersist(file, { user } = {}, fileId = null) {
    const transformedFiles = await mediaBuilder.transform(file);

    // upload files to provider
    await mapAsync(transformedFiles, getService('provider').upload);

    // persist file in database
    const dbFile = mediaBuilder.groupByFormats(transformedFiles, file);

    return fileId // return persisted file
      ? this.update(fileId, dbFile, { user })
      : this.add(dbFile, { user });
  },

  async updateFileInfo(id, { name, alternativeText, caption, folder }, { user } = {}) {
    const dbFile = await this.findOne(id);

    if (!dbFile) {
      throw new NotFoundError();
    }

    const fileService = getService('file');

    const newName = _.isNil(name) ? dbFile.name : name;
    const newInfos = {
      name: newName,
      alternativeText: _.isNil(alternativeText) ? dbFile.alternativeText : alternativeText,
      caption: _.isNil(caption) ? dbFile.caption : caption,
      folder: _.isUndefined(folder) ? dbFile.folder : folder,
      folderPath: _.isUndefined(folder) ? dbFile.path : await fileService.getFolderPath(folder),
    };

    return this.update(id, newInfos, { user });
  },

  async replace(id, { data, file: fileData }, { user } = {}) {
    const config = strapi.config.get('plugin.upload');

    const dbFile = await this.findOne(id);
    if (!dbFile) {
      throw new NotFoundError("Can't find file to update");
    }

    return withTempDirectory(async (tmpWorkingDirectory) => {
      const { fileInfo } = data;
      const file = await this.formatUploadFile(fileData, fileInfo, { tmpWorkingDirectory });

      // keep hash and extension so the file url doesn't change when the file is replaced
      _.assign(file, {
        hash: dbFile.hash,
        ext: dbFile.ext,
        formats: {},
      });

      // execute delete function of the provider
      if (dbFile.provider === config.provider) {
        await strapi.plugin('upload').provider.delete(dbFile);

        if (dbFile.formats) {
          const fileFormats = Object.values(dbFile.formats);
          await mapAsync(fileFormats, strapi.plugin('upload').provider.delete);
        }
      }

      return this.uploadFileAndPersist(file, { user }, dbFile.id);
    });
  },

  async update(id, values, { user } = {}) {
    const fileValues = { ...values };
    if (user) {
      fileValues[UPDATED_BY_ATTRIBUTE] = user.id;
    }

    getService('metrics').sendMediaSaveMetrics(fileValues);

    const res = await strapi.entityService.update(FILE_MODEL_UID, id, { data: fileValues });

    await this.emitEvent(MEDIA_UPDATE, res);

    return res;
  },

  async add(values, { user } = {}) {
    const fileValues = { ...values };
    if (user) {
      fileValues[UPDATED_BY_ATTRIBUTE] = user.id;
      fileValues[CREATED_BY_ATTRIBUTE] = user.id;
    }

    getService('metrics').sendMediaSaveMetrics(fileValues);

    const res = await strapi.query(FILE_MODEL_UID).create({ data: fileValues });

    await this.emitEvent(MEDIA_CREATE, res);

    return res;
  },

  findOne(id, populate) {
    return strapi.entityService.findOne(FILE_MODEL_UID, id, { populate });
  },

  findMany(query) {
    return strapi.entityService.findMany(FILE_MODEL_UID, query);
  },

  findPage(query) {
    return strapi.entityService.findPage(FILE_MODEL_UID, query);
  },

  async remove(file) {
    const config = strapi.config.get('plugin.upload');

    // execute delete function of the provider
    if (file.provider === config.provider) {
      await strapi.plugin('upload').provider.delete(file);

      if (file.formats) {
        const fileFormats = Object.values(file.formats);
        await mapAsync(fileFormats, strapi.plugin('upload').provider.delete);
      }
    }

    const deleteQuery = { where: { id: file.id } };
    const media = await strapi.query(FILE_MODEL_UID).findOne(deleteQuery);
    await this.emitEvent(MEDIA_DELETE, media);
    return strapi.query(FILE_MODEL_UID).delete(deleteQuery);
  },

  async uploadToEntity(params, files) {
    const { id, model, field } = params;
    const apiUploadFolder = await getService('api-upload-folder').getAPIUploadFolder();

    await withTempDirectory(async (tmpWorkingDirectory) => {
      const fileInfo = { folder: apiUploadFolder.id };
      const fileMetadata = { refId: id, ref: model, field, tmpWorkingDirectory };

      return mapAsync(
        castArray(files),
        pipe(
          (file) => this.formatUploadFile(file, fileInfo, fileMetadata),
          (file) => this.uploadFileAndPersist(file, fileMetadata)
        )
      );
    });
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

  getConfiguration() {
    return strapi.store({ type: 'plugin', name: 'upload', key: 'view_configuration' }).get();
  },

  setConfiguration(value) {
    return strapi
      .store({ type: 'plugin', name: 'upload', key: 'view_configuration' })
      .set({ value });
  },
});
