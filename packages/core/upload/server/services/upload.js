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
const { extension } = require('mime-types');
const {
  sanitize,
  nameToSlug,
  contentTypes: contentTypesUtils,
  errors: { ApplicationError, NotFoundError },
  file: { bytesToKbytes },
} = require('@strapi/utils');

const {
  FILE_MODEL_UID,
  ALLOWED_WEBHOOK_EVENTS: { MEDIA_CREATE, MEDIA_UPDATE, MEDIA_DELETE },
} = require('../constants');
const { getService } = require('../utils');

const { UPDATED_BY_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

const randomSuffix = () => crypto.randomBytes(5).toString('hex');

const generateFileName = (name) => {
  const baseName = nameToSlug(name, { separator: '_', lowercase: false });

  return `${baseName}_${randomSuffix()}`;
};

const sendMediaMetrics = (data) => {
  if (_.has(data, 'caption') && !_.isEmpty(data.caption)) {
    strapi.telemetry.send('didSaveMediaWithCaption');
  }

  if (_.has(data, 'alternativeText') && !_.isEmpty(data.alternativeText)) {
    strapi.telemetry.send('didSaveMediaWithAlternativeText');
  }
};

const createAndAssignTmpWorkingDirectoryToFiles = async (files) => {
  const tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-upload-'));

  if (Array.isArray(files)) {
    files.forEach((file) => {
      file.tmpWorkingDirectory = tmpWorkingDirectory;
    });
  } else {
    files.tmpWorkingDirectory = tmpWorkingDirectory;
  }

  return tmpWorkingDirectory;
};

function filenameReservedRegex() {
  // eslint-disable-next-line no-control-regex
  return /[<>:"/\\|?*\u0000-\u001F]/g;
}

function windowsReservedNameRegex() {
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i;
}

/**
 * Copied from https://github.com/sindresorhus/valid-filename package
 */
function isValidFilename(string) {
  if (!string || string.length > 255) {
    return false;
  }
  if (filenameReservedRegex().test(string) || windowsReservedNameRegex().test(string)) {
    return false;
  }
  if (string === '.' || string === '..') {
    return false;
  }
  return true;
}

module.exports = ({ strapi }) => ({
  async emitEvent(event, data) {
    const modelDef = strapi.getModel(FILE_MODEL_UID);
    const sanitizedData = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, data);

    strapi.eventHub.emit(event, { media: sanitizedData });
  },

  async formatFileInfo({ filename, type, size }, fileInfo = {}, metas = {}) {
    const fileService = getService('file');

    if (!isValidFilename(filename)) {
      throw new ApplicationError('File name contains invalid characters');
    }

    let ext = path.extname(filename);
    if (!ext) {
      ext = `.${extension(type)}`;
    }

    const usedName = (fileInfo.name || filename).normalize();
    const basename = path.basename(usedName, ext);

    // Prevent null characters in file name
    if (!isValidFilename(usedName)) {
      throw new ApplicationError('File name contains invalid characters');
    }

    const entity = {
      name: usedName,
      alternativeText: fileInfo.alternativeText,
      caption: fileInfo.caption,
      folder: fileInfo.folder,
      folderPath: await fileService.getFolderPath(fileInfo.folder),
      hash: generateFileName(basename),
      ext,
      mime: type,
      size: bytesToKbytes(size),
      sizeInBytes: size,
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

  async enhanceAndValidateFile(file, fileInfo = {}, metas = {}) {
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

    currentFile.filepath = file.path;
    currentFile.getStream = () => fs.createReadStream(file.path);

    const { optimize, isImage, isFaultyImage, isOptimizableImage } = strapi
      .plugin('upload')
      .service('image-manipulation');

    if (await isImage(currentFile)) {
      if (await isFaultyImage(currentFile)) {
        throw new ApplicationError('File is not a valid image');
      }
      if (await isOptimizableImage(currentFile)) {
        return optimize(currentFile);
      }
    }
    return currentFile;
  },

  // TODO V5: remove enhanceFile
  async enhanceFile(file, fileInfo = {}, metas = {}) {
    process.emitWarning(
      '[deprecated] In future versions, `enhanceFile` will be removed. Replace it with `enhanceAndValidateFile` instead.'
    );
    return this.enhanceAndValidateFile(file, fileInfo, metas);
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
        const fileData = await this.enhanceAndValidateFile(file, fileInfo, metas);
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

  /**
   * When uploading an image, an additional thumbnail is generated.
   * Also, if there are responsive formats defined, another set of images will be generated too.
   *
   * @param {*} fileData
   */
  async uploadImage(fileData) {
    const { getDimensions, generateThumbnail, generateResponsiveFormats, isResizableImage } =
      getService('image-manipulation');

    // Store width and height of the original image
    const { width, height } = await getDimensions(fileData);

    // Make sure this is assigned before calling any upload
    // That way it can mutate the width and height
    _.assign(fileData, {
      width,
      height,
    });

    // For performance reasons, all uploads are wrapped in a single Promise.all
    const uploadThumbnail = async (thumbnailFile) => {
      await getService('provider').upload(thumbnailFile);
      _.set(fileData, 'formats.thumbnail', thumbnailFile);
    };

    // Generate thumbnail and responsive formats
    const uploadResponsiveFormat = async (format) => {
      const { key, file } = format;
      await getService('provider').upload(file);
      _.set(fileData, ['formats', key], file);
    };

    /**
     * Create an array of callbacks that will be executed in parallel.
     *
     * NOTE: Eagerly calling the promises and calling Promise.all at the end
     *       resulted in some issues with streams and unhandled promises.
     */
    const uploadCallbacks = [];

    // Upload image
    uploadCallbacks.push(() => getService('provider').upload(fileData));

    // Generate & Upload thumbnail and responsive formats
    if (await isResizableImage(fileData)) {
      const thumbnailFile = await generateThumbnail(fileData);
      if (thumbnailFile) {
        uploadCallbacks.push(() => uploadThumbnail(thumbnailFile));
      }
      const formats = await generateResponsiveFormats(fileData);
      if (Array.isArray(formats) && formats.length > 0) {
        for (const format of formats) {
          // eslint-disable-next-line no-continue
          if (!format) continue;
          uploadCallbacks.push(() => uploadResponsiveFormat(format));
        }
      }
    }
    // Wait for all uploads to finish
    await Promise.all(uploadCallbacks.map((fn) => fn()));
  },

  /**
   * Upload a file. If it is an image it will generate a thumbnail
   * and responsive formats (if enabled).
   */
  async uploadFileAndPersist(fileData, { user } = {}) {
    const config = strapi.config.get('plugin.upload');
    const { isImage } = getService('image-manipulation');

    await getService('provider').checkFileSize(fileData);

    if (await isImage(fileData)) {
      await this.uploadImage(fileData);
    } else {
      await getService('provider').upload(fileData);
    }

    _.set(fileData, 'provider', config.provider);

    // Persist file(s)
    return this.add(fileData, { user });
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

  async replace(id, { data, file }, { user } = {}) {
    const config = strapi.config.get('plugin.upload');

    const { isImage } = getService('image-manipulation');

    const dbFile = await this.findOne(id);
    if (!dbFile) {
      throw new NotFoundError();
    }

    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(file);

    let fileData;

    try {
      const { fileInfo } = data;
      fileData = await this.enhanceAndValidateFile(file, fileInfo);

      // keep a constant hash and extension so the file url doesn't change when the file is replaced
      _.assign(fileData, {
        hash: dbFile.hash,
        ext: dbFile.ext,
      });

      // execute delete function of the provider
      if (dbFile.provider === config.provider) {
        await strapi.plugin('upload').provider.delete(dbFile);

        if (dbFile.formats) {
          await Promise.all(
            Object.keys(dbFile.formats).map((key) => {
              return strapi.plugin('upload').provider.delete(dbFile.formats[key]);
            })
          );
        }
      }

      // clear old formats
      _.set(fileData, 'formats', {});

      if (await isImage(fileData)) {
        await this.uploadImage(fileData);
      } else {
        await getService('provider').upload(fileData);
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

    sendMediaMetrics(fileValues);

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
        await Promise.all(
          Object.keys(file.formats).map((key) => {
            return strapi.plugin('upload').provider.delete(file.formats[key]);
          })
        );
      }
    }

    const media = await strapi.query(FILE_MODEL_UID).findOne({
      where: { id: file.id },
    });

    await this.emitEvent(MEDIA_DELETE, media);

    return strapi.query(FILE_MODEL_UID).delete({ where: { id: file.id } });
  },

  async uploadToEntity(params, files) {
    const { id, model, field } = params;

    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(files);

    const arr = Array.isArray(files) ? files : [files];

    const apiUploadFolderService = getService('api-upload-folder');

    const apiUploadFolder = await apiUploadFolderService.getAPIUploadFolder();

    try {
      const enhancedFiles = await Promise.all(
        arr.map((file) => {
          return this.enhanceAndValidateFile(
            file,
            { folder: apiUploadFolder.id },
            {
              refId: id,
              ref: model,
              field,
            }
          );
        })
      );

      await Promise.all(enhancedFiles.map((file) => this.uploadFileAndPersist(file)));
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

  getConfiguration() {
    return strapi.store({ type: 'plugin', name: 'upload', key: 'view_configuration' }).get();
  },

  setConfiguration(value) {
    return strapi
      .store({ type: 'plugin', name: 'upload', key: 'view_configuration' })
      .set({ value });
  },
});
