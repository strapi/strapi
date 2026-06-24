import fp from 'lodash/fp.js';
import { extension } from 'mime-types';
import {
  async,
  sanitize,
  contentTypes as contentTypesUtils,
  errors,
  file as fileUtils,
  pagination as paginationUtils,
} from '@strapi/utils';
import os from 'os';
import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';

import type { Core, UID } from '@strapi/types';

import { FILE_MODEL_UID, ALLOWED_WEBHOOK_EVENTS } from '../constants';
import { getService } from '../utils';

import type { Config, File, InputFile, UploadableFile, FileInfo } from '../types';
import type { ViewConfiguration } from '../controllers/validation/admin/configureView';
import type { Settings } from '../controllers/validation/admin/settings';

const { has, toNumber } = fp;

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
  const fileService = getService('file');

  const sendMediaMetrics = async (data: Pick<File, 'caption' | 'alternativeText'>) => {
    if (_.has(data, 'caption') && !_.isEmpty(data.caption)) {
      await getService('metrics').trackUsage('didSaveMediaWithCaption');
    }

    if (_.has(data, 'alternativeText') && !_.isEmpty(data.alternativeText)) {
      await getService('metrics').trackUsage('didSaveMediaWithAlternativeText');
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
    const imageManipulationService = getService('image-manipulation');

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
      focalPoint: fileInfo.focalPoint,
      folder: fileInfo.folder,
      folderPath: await fileService.getFolderPath(fileInfo.folder),
      hash: imageManipulationService.generateFileName(basename),
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
    // Prefer detected MIME type from security validation. Treat application/octet-stream as
    // undeclared so we use detected type when the client sends no real Content-Type.
    const detected = (file as any).detectedMimeType;
    const declared = file.mimetype || '';
    const mimeType =
      detected ||
      (declared && declared !== 'application/octet-stream' ? declared : undefined) ||
      'application/octet-stream';

    const currentFile = (await formatFileInfo(
      {
        filename: file.originalFilename ?? 'unamed',
        type: mimeType,
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
      files: InputFile[];
    },
    opts?: CommonOptions
  ) {
    const { user } = opts ?? {};
    // create temporary folder to store files for stream manipulation
    const tmpWorkingDirectory = await createAndAssignTmpWorkingDirectoryToFiles(files);

    const uploadedFiles = [];
    try {
      const { fileInfo, ...metas } = data;

      const fileArray = Array.isArray(files) ? files : [files];
      const fileInfoArray = Array.isArray(fileInfo) ? fileInfo : [fileInfo];

      const doUpload = async (file: InputFile, fileInfo: FileInfo) => {
        const fileData = await enhanceAndValidateFile(file, fileInfo, metas);
        return uploadFileAndPersist(fileData, { user });
      };

      const concurrentUploadSize = Math.max(
        1,
        strapi.config.get<Config>('plugin::upload').concurrentUploadSize ?? 1
      );

      const fileBatches = _.chunk(
        fileArray.map((file, idx) => ({ file, fileInfo: fileInfoArray[idx] || {} })),
        concurrentUploadSize
      );

      for (const batch of fileBatches) {
        const results = await Promise.all(
          batch.map(({ file, fileInfo }) => doUpload(file, fileInfo))
        );
        uploadedFiles.push(...results);
      }
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

    // [lodash: assign — skipped, target is existing variable not {}]
    // eslint-disable-next-line you-dont-need-lodash-underscore/assign
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
   * Like uploadImage, but pairs the main file and each format with its old
   * counterpart and routes through provider.replace so providers that implement
   * an atomic replace can use it. Formats that no longer exist on the new image
   * are deleted; formats that didn't exist on the old image are uploaded fresh.
   */
  async function replaceImage(fileData: UploadableFile, oldFile: File) {
    const { getDimensions, generateThumbnail, generateResponsiveFormats, isResizableImage } =
      getService('image-manipulation');

    const { width, height } = await getDimensions(fileData);

    // [lodash: assign — skipped, target is existing variable not {}]
    // eslint-disable-next-line you-dont-need-lodash-underscore/assign
    _.assign(fileData, {
      width,
      height,
    });

    const replaceFormat = async (key: string, newFormat: UploadableFile) => {
      const oldFormat = oldFile.formats?.[key] as File | undefined;
      if (oldFormat) {
        await getService('provider').replace(newFormat, oldFormat);
      } else {
        await getService('provider').upload(newFormat);
      }
      _.set(fileData, ['formats', key], newFormat);
    };

    const promises: Promise<unknown>[] = [];

    // Replace the main file
    promises.push(getService('provider').replace(fileData, oldFile));

    const newFormatKeys = new Set<string>();

    if (await isResizableImage(fileData)) {
      const thumbnailFile = await generateThumbnail(fileData);
      if (thumbnailFile) {
        newFormatKeys.add('thumbnail');
        promises.push(replaceFormat('thumbnail', thumbnailFile));
      }

      const formats = await generateResponsiveFormats(fileData);
      if (Array.isArray(formats) && formats.length > 0) {
        for (const format of formats) {
          // eslint-disable-next-line no-continue
          if (!format) continue;
          newFormatKeys.add(format.key);
          promises.push(replaceFormat(format.key, format.file));
        }
      }
    }

    // Delete any formats that existed on the old file but are not present on the new one
    if (
      oldFile.formats &&
      oldFile.provider === strapi.config.get<Config>('plugin::upload').provider
    ) {
      for (const oldKey of Object.keys(oldFile.formats)) {
        if (!newFormatKeys.has(oldKey)) {
          const oldFormat = oldFile.formats[oldKey] as File;
          promises.push(strapi.plugin('upload').provider.delete(oldFormat));
        }
      }
    }

    await Promise.all(promises);
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
    { name, alternativeText, caption, focalPoint, folder }: FileInfo,
    opts?: CommonOptions
  ) {
    const { user } = opts ?? {};

    const dbFile = await findOne(id);

    if (!dbFile) {
      throw new NotFoundError();
    }

    const fileService = getService('file');

    const newName = name === null || name === undefined ? dbFile.name : name;
    const newInfos = {
      name: newName,
      alternativeText:
        alternativeText === null || alternativeText === undefined
          ? dbFile.alternativeText
          : alternativeText,
      caption: caption === null || caption === undefined ? dbFile.caption : caption,
      focalPoint: focalPoint === null || focalPoint === undefined ? dbFile.focalPoint : focalPoint,
      folder: folder === undefined ? dbFile.folder : folder,
      folderPath:
        folder === undefined ? dbFile.folderPath : await fileService.getFolderPath(folder),
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
      // [lodash: assign — skipped, target is existing variable not {}]
      // eslint-disable-next-line you-dont-need-lodash-underscore/assign
      _.assign(fileData, {
        hash: dbFile.hash,
        ext: dbFile.ext,
      });

      // clear old formats — replaceImage / replace will set new ones
      _.set(fileData, 'formats', {});

      if (dbFile.provider === config.provider) {
        if (await isImage(fileData)) {
          await replaceImage(fileData, dbFile);
        } else {
          // The new file is not an image, so it has no formats. Replace the main
          // file, then delete any formats the old image left behind — otherwise
          // they're orphaned in storage since the DB record no longer tracks them.
          await getService('provider').replace(fileData, dbFile);
          if (dbFile.formats) {
            await Promise.all(
              Object.keys(dbFile.formats).map((key) =>
                strapi.plugin('upload').provider.delete(dbFile.formats![key] as File)
              )
            );
          }
        }
      } else if (await isImage(fileData)) {
        // Cross-provider replacement: no delete on the old provider, upload to the new one.
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

    await sendMediaMetrics(fileValues);

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

    await sendMediaMetrics(fileValues);

    const res = await strapi.db.query(FILE_MODEL_UID).create({ data: fileValues });

    await emitEvent(MEDIA_CREATE, res);

    return res;
  }

  async function findOne(id: ID, populate = {}) {
    const query = strapi.get('query-params').transform(FILE_MODEL_UID, {
      populate,
    });

    const file = await strapi.db.query(FILE_MODEL_UID).findOne({
      where: { id },
      ...query,
    });

    if (!file) return file;

    // Sign file URLs if using private provider
    return fileService.signFileUrls(file);
  }

  async function findMany(query: any = {}): Promise<File[]> {
    const files = await strapi.db
      .query(FILE_MODEL_UID)
      .findMany(strapi.get('query-params').transform(FILE_MODEL_UID, query));

    // Sign file URLs if using private provider
    return async.map(files, (file: File) => fileService.signFileUrls(file));
  }

  async function findPage(query: any = {}) {
    const result = await strapi.db
      .query(FILE_MODEL_UID)
      .findPage(strapi.get('query-params').transform(FILE_MODEL_UID, query));

    // Sign file URLs if using private provider
    const signedResults = await async.map(result.results, (file: File) =>
      fileService.signFileUrls(file)
    );

    return {
      ...result,
      results: signedResults,
    };
  }

  /**
   * Resolve whether the count query should run, mirroring core-api's `shouldCount`.
   * Defaults to the `api.rest.withCount` config (true) when not specified on the request.
   */
  function resolveWithCount(pagination: Record<string, unknown>): boolean {
    if (has('withCount', pagination)) {
      const withCount = pagination.withCount;

      if (typeof withCount === 'boolean') {
        return withCount;
      }

      if (typeof withCount === 'undefined') {
        return false;
      }

      if (['true', 't', '1', 1].includes(withCount as string | number)) {
        return true;
      }

      if (['false', 'f', '0', 0].includes(withCount as string | number)) {
        return false;
      }

      throw new errors.ValidationError(
        'Invalid withCount parameter. Expected "t","1","true","false","0","f"'
      );
    }

    return Boolean(strapi.config.get('api.rest.withCount', true));
  }

  /**
   * REST-aware paginated find for the content API.
   *
   * Unlike `findPage` (used by the admin API), this honors the standard nested
   * `pagination` query object (`pagination[page]`, `pagination[pageSize]`,
   * `pagination[start]`, `pagination[limit]`, `pagination[withCount]`) and the
   * `api.rest.defaultLimit` / `api.rest.maxLimit` / `api.rest.withCount` config,
   * exactly like every other Strapi REST collection-type endpoint.
   */
  async function findAndCountPage(query: any = {}) {
    const { pagination = {} } = query;

    const defaultLimit = toNumber(strapi.config.get('api.rest.defaultLimit', 25));
    const maxLimit = toNumber(strapi.config.get('api.rest.maxLimit')) || null;

    // Whether the consumer used page-based pagination (default) vs offset-based.
    const isOffset = has('start', pagination) || has('limit', pagination);
    const isPaged = !isOffset;

    // Resolve start/limit applying defaults and the maxLimit cap.
    const { start, limit } = paginationUtils.withDefaultPagination(pagination, {
      defaults: { offset: { limit: defaultLimit }, page: { pageSize: defaultLimit } },
      maxLimit: maxLimit || -1,
    });

    // Feed the transform the resolved offset/limit so it ignores the nested
    // `pagination` object (which it cannot read) and applies real bounds.
    const transformed = strapi
      .get('query-params')
      .transform(FILE_MODEL_UID, { ...query, pagination: undefined, start, limit });

    const shouldCount = resolveWithCount(pagination);

    const [results, total] = await Promise.all([
      strapi.db.query(FILE_MODEL_UID).findMany(transformed),
      shouldCount ? strapi.db.query(FILE_MODEL_UID).count(transformed) : Promise.resolve(undefined),
    ]);

    const signedResults = await async.map(results, (file: File) => fileService.signFileUrls(file));

    const transform = isPaged
      ? paginationUtils.transformPagedPaginationInfo
      : paginationUtils.transformOffsetPaginationInfo;

    const paginationInfo = transform({ start, limit }, total as number);

    const { total: _total, pageCount: _pageCount, ...paginationWithoutCounts } = paginationInfo;
    return {
      results: signedResults,
      // Omit total & pageCount when counting is disabled (withCount=false).
      pagination: total === null || total === undefined ? paginationWithoutCounts : paginationInfo,
    };
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

  async function setSettings(value: Settings) {
    if (value.responsiveDimensions === true) {
      await getService('metrics').trackUsage('didEnableResponsiveDimensions');
    } else {
      await getService('metrics').trackUsage('didDisableResponsiveDimensions');
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
    findAndCountPage,
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
