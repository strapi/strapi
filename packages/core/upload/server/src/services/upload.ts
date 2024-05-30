import os from 'os';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';
import { extension } from 'mime-types';
import {
  sanitize,
  strings,
  contentTypes as contentTypesUtils,
  errors,
  file as fileUtils,
} from '@strapi/utils';

import type { Core, UID } from '@strapi/types';

import { FILE_MODEL_UID, ALLOWED_WEBHOOK_EVENTS } from '../constants';
import { getService } from '../utils';

import type { Config, File, InputFile, UploadableFile, FileInfo } from '../types';
import type { ViewConfiguration } from '../controllers/validation/admin/configureView';
import type { Settings } from '../controllers/validation/admin/settings';

type User = {
  id: string | number;
};

type ID = string | number;

type CommonOptions = {
  user?: User;
};

type Metas = {
  refId?: ID;
  ref?: string;
  field?: string;
  path?: string;
  tmpWorkingDirectory?: string;
};

const { UPDATED_BY_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;
const { MEDIA_CREATE, MEDIA_UPDATE, MEDIA_DELETE } = ALLOWED_WEBHOOK_EVENTS;

const { ApplicationError, NotFoundError } = errors;
const { bytesToKbytes } = fileUtils;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const randomSuffix = () => crypto.randomBytes(5).toString('hex');

  const generateFileName = (name: string) => {
    const baseName = strings.nameToSlug(name, { separator: '_', lowercase: false });

    return `${baseName}_${randomSuffix()}`;
  };

  const sendMediaMetrics = (data: Pick<File, 'caption' | 'alternativeText'>) => {
    if (_.has(data, 'caption') && !_.isEmpty(data.caption)) {
      strapi.telemetry.send('didSaveMediaWithCaption');
    }

    if (_.has(data, 'alternativeText') && !_.isEmpty(data.alternativeText)) {
      strapi.telemetry.send('didSaveMediaWithAlternativeText');
    }
  };

  const createAndAssignTmpWorkingDirectoryToFiles = async (
    files: InputFile | InputFile[]
  ): Promise<string> => {
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
  function isValidFilename(string: string) {
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

  async function emitEvent(event: string, data: Record<string, any>) {
    const modelDef = strapi.getModel(FILE_MODEL_UID);
    const sanitizedData = await sanitize.sanitizers.defaultSanitizeOutput(
      {
        schema: modelDef,
        getModel(uid: string) {
          return strapi.getModel(uid as UID.Schema);
        },
      },
      data
    );

    strapi.eventHub.emit(event, { media: sanitizedData });
  }

  async function formatFileInfo(
    { filename, type, size }: { filename: string; type: string; size: number },
    fileInfo: Partial<FileInfo> = {},
    metas: {
      refId?: ID;
      ref?: string;
      field?: string;
      path?: string;
      tmpWorkingDirectory?: string;
    } = {}
  ): Promise<Omit<UploadableFile, 'getStream'>> {
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
    if (!isValidFilename(filename)) {
      throw new ApplicationError('File name contains invalid characters');
    }

    const entity: Omit<UploadableFile, 'getStream'> = {
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
  }

  async function enhanceAndValidateFile(
    file: InputFile,
    fileInfo: FileInfo,
    metas?: Metas
  ): Promise<UploadableFile> {
    const currentFile = (await formatFileInfo(
      {
        filename: file.originalFilename ?? 'unamed',
        type: file.mimetype ?? 'application/octet-stream',
        size: file.size,
      },
      fileInfo,
      {
        ...metas,
        tmpWorkingDirectory: file.tmpWorkingDirectory,
      }
    )) as UploadableFile;

    currentFile.filepath = file.filepath;
    currentFile.getStream = () => fs.createReadStream(file.filepath);

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
  }

  async function upload(
    {
      data,
      files,
    }: {
      data: Record<string, unknown>;
      files: InputFile | InputFile[];
    },
    opts?: CommonOptions
  ) {
    const { user } = opts ?? {};
    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(files);

    let uploadedFiles: any[] = [];

    try {
      const { fileInfo, ...metas } = data;

      const fileArray = Array.isArray(files) ? files : [files];
      const fileInfoArray = Array.isArray(fileInfo) ? fileInfo : [fileInfo];

      const doUpload = async (file: InputFile, fileInfo: FileInfo) => {
        const fileData = await enhanceAndValidateFile(file, fileInfo, metas);
        return uploadFileAndPersist(fileData, { user });
      };

      uploadedFiles = await Promise.all(
        fileArray.map((file, idx) => doUpload(file, fileInfoArray[idx] || {}))
      );
    } finally {
      // delete temporary folder
      await fse.remove(tmpWorkingDirectory);
    }

    return uploadedFiles;
  }

  /**
   * When uploading an image, an additional thumbnail is generated.
   * Also, if there are responsive formats defined, another set of images will be generated too.
   *
   * @param {*} fileData
   */
  async function uploadImage(fileData: UploadableFile) {
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
    const uploadThumbnail = async (thumbnailFile: UploadableFile) => {
      await getService('provider').upload(thumbnailFile);
      _.set(fileData, 'formats.thumbnail', thumbnailFile);
    };

    // Generate thumbnail and responsive formats
    const uploadResponsiveFormat = async (format: { key: string; file: UploadableFile }) => {
      const { key, file } = format;
      await getService('provider').upload(file);
      _.set(fileData, ['formats', key], file);
    };

    const uploadPromises: Promise<void>[] = [];

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
  }

  /**
   * Upload a file. If it is an image it will generate a thumbnail
   * and responsive formats (if enabled).
   */
  async function uploadFileAndPersist(fileData: UploadableFile, opts?: CommonOptions) {
    const { user } = opts ?? {};

    const config = strapi.config.get<Config>('plugin::upload');
    const { isImage } = getService('image-manipulation');

    await getService('provider').checkFileSize(fileData);

    if (await isImage(fileData)) {
      await uploadImage(fileData);
    } else {
      await getService('provider').upload(fileData);
    }

    _.set(fileData, 'provider', config.provider);

    // Persist file(s)
    return add(fileData, { user });
  }

  async function updateFileInfo(
    id: ID,
    { name, alternativeText, caption, folder }: FileInfo,
    opts?: CommonOptions
  ) {
    const { user } = opts ?? {};

    const dbFile = await findOne(id);

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

    return update(id, newInfos, { user });
  }

  async function replace(
    id: ID,
    { data, file }: { data: { fileInfo: FileInfo }; file: InputFile },
    opts?: CommonOptions
  ) {
    const { user } = opts ?? {};

    const config = strapi.config.get<Config>('plugin::upload');

    const { isImage } = getService('image-manipulation');

    const dbFile = await findOne(id);
    if (!dbFile) {
      throw new NotFoundError();
    }

    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(file);

    let fileData: UploadableFile;

    try {
      const { fileInfo } = data;
      fileData = await enhanceAndValidateFile(file, fileInfo);

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
        await uploadImage(fileData);
      } else {
        await getService('provider').upload(fileData);
      }

      _.set(fileData, 'provider', config.provider);
    } finally {
      // delete temporary folder
      await fse.remove(tmpWorkingDirectory);
    }

    return update(id, fileData, { user });
  }

  async function update(id: ID, values: Partial<File>, opts?: CommonOptions) {
    const { user } = opts ?? {};

    const fileValues = { ...values };
    if (user) {
      Object.assign(fileValues, {
        [UPDATED_BY_ATTRIBUTE]: user.id,
      });
    }

    sendMediaMetrics(fileValues);

    const res = await strapi.db.query(FILE_MODEL_UID).update({ where: { id }, data: fileValues });

    await emitEvent(MEDIA_UPDATE, res);

    return res;
  }

  async function add(values: any, opts?: CommonOptions) {
    const { user } = opts ?? {};

    const fileValues = { ...values };
    if (user) {
      Object.assign(fileValues, {
        [UPDATED_BY_ATTRIBUTE]: user.id,
        [CREATED_BY_ATTRIBUTE]: user.id,
      });
    }

    sendMediaMetrics(fileValues);

    const res = await strapi.db.query(FILE_MODEL_UID).create({ data: fileValues });

    await emitEvent(MEDIA_CREATE, res);

    return res;
  }

  function findOne(id: ID, populate = {}) {
    const query = strapi.get('query-params').transform(FILE_MODEL_UID, {
      populate,
    });

    return strapi.db.query(FILE_MODEL_UID).findOne({
      where: { id },
      ...query,
    });
  }

  function findMany(query: any = {}): Promise<File[]> {
    return strapi.db
      .query(FILE_MODEL_UID)
      .findMany(strapi.get('query-params').transform(FILE_MODEL_UID, query));
  }

  function findPage(query: any = {}) {
    return strapi.db
      .query(FILE_MODEL_UID)
      .findPage(strapi.get('query-params').transform(FILE_MODEL_UID, query));
  }

  async function remove(file: File) {
    const config = strapi.config.get<Config>('plugin::upload');

    // execute delete function of the provider
    if (file.provider === config.provider) {
      await strapi.plugin('upload').provider.delete(file);

      if (file.formats) {
        const keys = Object.keys(file.formats);

        await Promise.all(
          keys.map((key) => {
            return strapi.plugin('upload').provider.delete(file.formats![key]);
          })
        );
      }
    }

    const media = await strapi.db.query(FILE_MODEL_UID).findOne({
      where: { id: file.id },
    });

    await emitEvent(MEDIA_DELETE, media);

    return strapi.db.query(FILE_MODEL_UID).delete({ where: { id: file.id } });
  }

  async function getSettings() {
    const res = await strapi.store!({ type: 'plugin', name: 'upload', key: 'settings' }).get({});

    return res as Settings | null;
  }

  function setSettings(value: Settings) {
    if (value.responsiveDimensions === true) {
      strapi.telemetry.send('didEnableResponsiveDimensions');
    } else {
      strapi.telemetry.send('didDisableResponsiveDimensions');
    }

    return strapi.store!({ type: 'plugin', name: 'upload', key: 'settings' }).set({ value });
  }

  async function getConfiguration() {
    const res = await strapi.store!({
      type: 'plugin',
      name: 'upload',
      key: 'view_configuration',
    }).get({});

    return res as ViewConfiguration | null;
  }

  function setConfiguration(value: ViewConfiguration) {
    return strapi.store!({ type: 'plugin', name: 'upload', key: 'view_configuration' }).set({
      value,
    });
  }

  return {
    formatFileInfo,
    upload,
    updateFileInfo,
    replace,
    findOne,
    findMany,
    findPage,
    remove,
    getSettings,
    setSettings,
    getConfiguration,
    setConfiguration,

    /**
     * exposed for testing only
     * @internal
     */
    _uploadImage: uploadImage,
  };
};
