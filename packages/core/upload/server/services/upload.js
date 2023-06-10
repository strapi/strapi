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
const { set, pipe, toArray, zip } = require('lodash/fp');
const { extension } = require('mime-types');
const {
  sanitize,
  nameToSlug,
  contentTypes: contentTypesUtils,
  errors: { NotFoundError },
  file: { bytesToKbytes },
  mapAsync,
} = require('@strapi/utils');
const { getService } = require('../utils');
const {
  FILE_MODEL_UID,
  ALLOWED_WEBHOOK_EVENTS: { MEDIA_CREATE, MEDIA_UPDATE, MEDIA_DELETE },
} = require('../constants');

const { UPDATED_BY_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

const sendMediaMetrics = (file) => {
  if (_.has(file, 'caption') && !_.isEmpty(file.caption)) {
    strapi.telemetry.send('didSaveMediaWithCaption');
  }

  if (_.has(file, 'alternativeText') && !_.isEmpty(file.alternativeText)) {
    strapi.telemetry.send('didSaveMediaWithAlternativeText');
  }
};

async function withTempDirectory(callback) {
  const folderPath = path.join(os.tmpdir(), 'strapi-upload-');
  const folder = fse.mkdtemp(folderPath);

  try {
    return callback(folder);
  } finally {
    await fse.remove(folder);
  }
}

const generateFileName = (name) => {
  const baseName = nameToSlug(name, { separator: '_', lowercase: false });
  const randomSuffix = crypto.randomBytes(5).toString('hex');
  return `${baseName}_${randomSuffix}`;
};

module.exports = ({ strapi }) => ({
  async emitEvent(event, data) {
    const modelDef = strapi.getModel(FILE_MODEL_UID);
    const sanitizedData = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, data);
    strapi.eventHub.emit(event, { media: sanitizedData });
  },

  async formatFileInfo({ filename, type, size }, fileInfo = {}, metas = {}) {
    const fileService = getService('file');

    const ext = path.extname(filename) || `.${extension(type)}`;
    const name = (fileInfo.name || filename).normalize();
    const basename = path.basename(name, ext);

    const file = {
      name,
      alternativeText: fileInfo.alternativeText,
      caption: fileInfo.caption,
      folder: fileInfo.folder,
      folderPath: await fileService.getFolderPath(fileInfo.folder),
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

    // TODO: Remove this
    if (metas.tmpWorkingDirectory) {
      file.tmpWorkingDirectory = metas.tmpWorkingDirectory;
    }

    return file;
  },

  /**
   * Adds properties needed to upload the file to a provider.
   */
  async formatUploadFile({ filename, type, size }, fileInfo = {}, metas = {}) {
    const config = strapi.config.get('plugin.upload');
    const file = await this.formatFileInfo({ filename, type, size }, fileInfo, metas);

    // TODO: Get file type

    return pipe(
      set('getStream', () => fs.createReadStream(file.path)),
      set('provider', config.provider)
    )(file);
  },

  // fileToDB(files) {},

  // fileFromDB(file) {},

  /**
   * Uploads a file and persists it in the database.
   */
  async upload({ data, files }, { user } = {}) {
    const { fileInfo, ...metas } = data;

    const filesAndInfo = zip(
      toArray(fileInfo).map((info) => info || {}),
      toArray(files)
    );

    return withTempDirectory((tmpWorkingDirectory) => {
      const fileMetadata = { ...metas, tmpWorkingDirectory };

      const doUpload = async ([fileData, fileInfo]) => {
        const file = await this.formatFileInfo(fileData, fileInfo, fileMetadata);
        return this.uploadFileAndPersist(file, { user });
      };

      return mapAsync(filesAndInfo, doUpload);
    });
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

    const uploadPromises = [];

    // Upload image
    uploadPromises.push(getService('provider').upload(fileData));

    // Generate & Upload thumbnail and responsive formats
    if (await isResizableImage(fileData)) {
      const thumbnailFile = await generateThumbnail(fileData);
      if (thumbnailFile) {
        uploadPromises.push(uploadThumbnail(thumbnailFile));
      }

      const formats = await generateResponsiveFormats(fileData);
      if (Array.isArray(formats) && formats.length > 0) {
        for (const format of formats) {
          // eslint-disable-next-line no-continue
          if (!format) continue;
          uploadPromises.push(uploadResponsiveFormat(format));
        }
      }
    }
    // Wait for all uploads to finish
    await Promise.all(uploadPromises);
  },

  async uploadFileAndPersist(fileData, { user } = {}) {
    const { isImage } = getService('image-manipulation');

    if (await isImage(fileData)) {
      await this.uploadImage(fileData);
    } else {
      await getService('provider').upload(fileData);
    }

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

  async replace(id, { data, file: fileData }, { user } = {}) {
    const config = strapi.config.get('plugin.upload');

    const { isImage } = getService('image-manipulation');

    const dbFile = await this.findOne(id);
    if (!dbFile) {
      throw new NotFoundError();
    }

    return withTempDirectory(async (tmpWorkingDirectory) => {
      const { fileInfo } = data;
      const file = await this.formatUploadFile(fileData, fileInfo, { tmpWorkingDirectory });

      // keep a constant hash and extension so the file url doesn't change when the file is replaced
      _.assign(file, {
        hash: dbFile.hash,
        ext: dbFile.ext,
      });

      // TODO: DB to files
      // execute delete function of the provider
      if (dbFile.provider === config.provider) {
        await strapi.plugin('upload').provider.delete(dbFile);

        if (dbFile.formats) {
          const fileFormats = Object.values(dbFile.formats);
          await mapAsync(fileFormats, strapi.plugin('upload').provider.delete);
        }
      }

      // clear old formats
      _.set(file, 'formats', {});

      if (await isImage(file)) {
        await this.uploadImage(file);
      } else {
        await getService('provider').upload(file);
      }

      return this.update(id, file, { user });
    });
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
    const apiUploadFolder = await getService('api-upload-folder').getAPIUploadFolder();

    await withTempDirectory(async (tmpWorkingDirectory) => {
      const fileInfo = { folder: apiUploadFolder.id };
      const fileMetadata = { refId: id, ref: model, field, tmpWorkingDirectory };

      return mapAsync(
        toArray(files),
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
