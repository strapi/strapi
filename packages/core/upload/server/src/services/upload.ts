import os from 'os';
import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _, { has, toNumber } from 'lodash';
import { extension } from 'mime-types';
import {
  async,
  sanitize,
  contentTypes as contentTypesUtils,
  errors,
  file as fileUtils,
  pagination as paginationUtils,
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

type StorageOperation = {
  name: string;
  file: Pick<File, 'hash' | 'ext'>;
  run: () => unknown | Promise<unknown>;
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const fileService = getService('file');

  const settleStorageOperations = async (operations: StorageOperation[]) => {
    const results = await Promise.allSettled(
      operations.map(({ run }) => Promise.resolve().then(run))
    );

    return operations.map((operation, index) => ({ operation, result: results[index] }));
  };

  const logStorageOperationFailure = (
    message: string,
    phase: string,
    outcomes: Awaited<ReturnType<typeof settleStorageOperations>>,
    context: Record<string, unknown> = {}
  ) => {
    strapi.log.error(message, {
      phase,
      ...context,
      operations: outcomes.map(({ operation, result }) => ({
        name: operation.name,
        file: {
          hash: operation.file.hash,
          ext: operation.file.ext,
        },
        status: result.status,
        ...(result.status === 'rejected'
          ? {
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            }
          : {}),
      })),
    });
  };

  const getFailedStorageOperations = (
    outcomes: Awaited<ReturnType<typeof settleStorageOperations>>
  ) => outcomes.filter(({ result }) => result.status === 'rejected');

  const throwFirstStorageOperationError = (
    failures: ReturnType<typeof getFailedStorageOperations>
  ): never => {
    const [firstFailure] = failures;
    const reason =
      firstFailure.result.status === 'rejected' ? firstFailure.result.reason : undefined;

    if (reason instanceof Error) {
      throw reason;
    }

    throw new Error(String(reason));
  };

  // TODO(upload-atomicity): This process-local cleanup is best-effort. It cannot recover after a
  // crash or resolve an ambiguous database commit; persistent operation tracking, reconciliation,
  // or provider-level atomic batches are required for those guarantees.
  const cleanupStorageFiles = async (
    files: Array<Pick<File, 'hash' | 'ext'>>,
    phase: string,
    context: Record<string, unknown> = {}
  ) => {
    if (files.length === 0) {
      return;
    }

    const outcomes = await settleStorageOperations(
      files.map((file, index) => ({
        name: `delete:${index}`,
        file,
        run: () => strapi.plugin('upload').provider.delete(file),
      }))
    );

    if (getFailedStorageOperations(outcomes).length > 0) {
      logStorageOperationFailure(
        'Failed to clean up one or more upload provider objects',
        phase,
        outcomes,
        context
      );
    }
  };

  const uploadPreparedFiles = async (files: UploadableFile[]) => {
    const outcomes = await settleStorageOperations(
      files.map((file, index) => ({
        name: index === 0 ? 'upload:original' : `upload:format:${index}`,
        file,
        run: () => getService('provider').upload(file),
      }))
    );
    const failures = getFailedStorageOperations(outcomes);

    if (failures.length > 0) {
      logStorageOperationFailure('One or more upload provider writes failed', 'upload', outcomes);
      await cleanupStorageFiles(files, 'upload-rollback');
      throwFirstStorageOperationError(failures);
    }

    return files;
  };

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
  async function uploadImage(fileData: UploadableFile): Promise<UploadableFile[]> {
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

    const preparedFormats: Array<{ key: string; file: UploadableFile }> = [];

    // Finish every transformation before the first provider write. A Sharp failure must not leave
    // the original file in storage without formats or a database record.
    if (await isResizableImage(fileData)) {
      const thumbnailFile = await generateThumbnail(fileData);
      if (thumbnailFile) {
        preparedFormats.push({ key: 'thumbnail', file: thumbnailFile });
      }

      const formats = await generateResponsiveFormats(fileData);
      if (Array.isArray(formats) && formats.length > 0) {
        for (const format of formats) {
          // eslint-disable-next-line no-continue
          if (!format) continue;
          preparedFormats.push(format);
        }
      }
    }

    const files = [fileData, ...preparedFormats.map(({ file }) => file)];
    await uploadPreparedFiles(files);

    for (const { key, file } of preparedFormats) {
      _.set(fileData, ['formats', key], file);
    }

    return files;
  }

  /**
   * Like uploadImage, but pairs the main file and each format with its old
   * counterpart and routes through provider.replace so providers that implement
   * an atomic replace can use it. Formats that didn't exist on the old image are
   * uploaded fresh. Obsolete formats are returned to the caller so it can delete
   * them only after the database update commits.
   */
  async function replaceImage(fileData: UploadableFile, oldFile: File): Promise<File[]> {
    const { getDimensions, generateThumbnail, generateResponsiveFormats, isResizableImage } =
      getService('image-manipulation');

    const { width, height } = await getDimensions(fileData);

    _.assign(fileData, {
      width,
      height,
    });

    const preparedFormats: Array<{ key: string; file: UploadableFile }> = [];
    const newFormatKeys = new Set<string>();

    // As with create, prepare every variant before changing any stored object.
    if (await isResizableImage(fileData)) {
      const thumbnailFile = await generateThumbnail(fileData);
      if (thumbnailFile) {
        newFormatKeys.add('thumbnail');
        preparedFormats.push({ key: 'thumbnail', file: thumbnailFile });
      }

      const formats = await generateResponsiveFormats(fileData);
      if (Array.isArray(formats) && formats.length > 0) {
        for (const format of formats) {
          // eslint-disable-next-line no-continue
          if (!format) continue;
          newFormatKeys.add(format.key);
          preparedFormats.push(format);
        }
      }
    }

    const operations: StorageOperation[] = [
      {
        name: 'replace:original',
        file: fileData,
        run: () => getService('provider').replace(fileData, oldFile),
      },
      ...preparedFormats.map(({ key, file }) => {
        const oldFormat = oldFile.formats?.[key] as File | undefined;

        return {
          name: oldFormat ? `replace:format:${key}` : `upload:format:${key}`,
          file,
          run: () =>
            oldFormat
              ? getService('provider').replace(file, oldFormat)
              : getService('provider').upload(file),
        };
      }),
    ];
    const outcomes = await settleStorageOperations(operations);
    const failures = getFailedStorageOperations(outcomes);

    if (failures.length > 0) {
      // TODO(upload-atomicity): Same-key replacements cannot be rolled back without a
      // provider-level atomic replace capability or versioned object keys. Keep every outcome
      // observable in the meantime.
      logStorageOperationFailure(
        'One or more upload provider replacements failed',
        'replace',
        outcomes,
        {
          assetId: oldFile.id,
        }
      );
      throwFirstStorageOperationError(failures);
    }

    for (const { key, file } of preparedFormats) {
      _.set(fileData, ['formats', key], file);
    }

    return Object.entries(oldFile.formats ?? {})
      .filter(([key]) => !newFormatKeys.has(key))
      .map(([, file]) => file as File);
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

    const uploadedFiles = (await isImage(fileData))
      ? await uploadImage(fileData)
      : await uploadPreparedFiles([fileData]);

    _.set(fileData, 'provider', config.provider);

    let persistedFile: File;
    try {
      persistedFile = await add(fileData, { user });
    } catch (error) {
      await cleanupStorageFiles(uploadedFiles, 'database-create-rollback');
      throw error;
    }

    // The database record now owns the stored objects. A post-commit event failure must not remove
    // them, otherwise the committed record would point at missing files.
    await emitEvent(MEDIA_CREATE, persistedFile);

    return persistedFile;
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

    const newName = _.isNil(name) ? dbFile.name : name;
    const newInfos = {
      name: newName,
      alternativeText: _.isNil(alternativeText) ? dbFile.alternativeText : alternativeText,
      caption: _.isNil(caption) ? dbFile.caption : caption,
      focalPoint: _.isNil(focalPoint) ? dbFile.focalPoint : focalPoint,
      folder: _.isUndefined(folder) ? dbFile.folder : folder,
      folderPath: _.isUndefined(folder)
        ? dbFile.folderPath
        : await fileService.getFolderPath(folder),
    };

    return update(id, newInfos, { user });
  }

  async function replace(
    id: ID,
    { data, file }: { data: { fileInfo: FileInfo } & Metas; file: InputFile },
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
    let obsoleteFormats: File[] = [];

    try {
      // `refId` / `ref` / `field` are dropped rather than forwarded: `formatFileInfo` turns
      // them into a one-element `related` array, and a bare array reaches the morph join as
      // `set` — which deletes every row for this file, detaching it from every other entry
      // that uses it. Attaching an existing file to an entry is the content API's job.
      const { fileInfo, refId: _refId, ref: _ref, field: _field, ...metas } = data;
      fileData = await enhanceAndValidateFile(file, fileInfo, metas);

      // Replacing a file writes new bytes just like creating one, so it has to
      // respect sizeLimit too. Checked before any provider write, and measured on
      // the same post-optimization file as the create path (uploadFileAndPersist).
      await getService('provider').checkFileSize(fileData);

      // keep a constant hash and extension so the file url doesn't change when the file is replaced
      _.assign(fileData, {
        hash: dbFile.hash,
        ext: dbFile.ext,
      });

      // A plain replace sends no folder, so `formatFileInfo` resolved folderPath to
      // '/' while the relation survived — and folder deletion selects by folderPath,
      // which orphaned the file. An explicitly sent folder still moves it.
      if (fileInfo?.folder === undefined) {
        _.assign(fileData, { folderPath: dbFile.folderPath });
      }

      // clear old formats — replaceImage / replace will set new ones
      _.set(fileData, 'formats', {});

      if (dbFile.provider === config.provider) {
        if (await isImage(fileData)) {
          obsoleteFormats = await replaceImage(fileData, dbFile);
        } else {
          // The new file is not an image, so it has no formats. Replace the main
          // file, then delete any formats the old image left behind — otherwise
          // they're orphaned in storage since the DB record no longer tracks them.
          await getService('provider').replace(fileData, dbFile);
          if (dbFile.formats) {
            obsoleteFormats = Object.values(dbFile.formats) as File[];
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

    const updatedFile = await update(id, fileData, { user });

    // Once the database no longer references obsolete formats, cleanup failures only leave
    // unreferenced provider objects. They must not make a committed replacement look unsuccessful.
    await cleanupStorageFiles(obsoleteFormats, 'post-commit-obsolete-format-cleanup', {
      assetId: dbFile.id,
      provider: dbFile.provider,
      databaseCommitted: true,
    });

    return updatedFile;
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

    return strapi.db.query(FILE_MODEL_UID).create({ data: fileValues });
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
    if (has(pagination, 'withCount')) {
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
    const isOffset = has(pagination, 'start') || has(pagination, 'limit');
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

    return {
      results: signedResults,
      // Omit total & pageCount when counting is disabled (withCount=false).
      pagination: total == null ? _.omit(paginationInfo, ['total', 'pageCount']) : paginationInfo,
    };
  }

  async function remove(file: File) {
    const config = strapi.config.get<Config>('plugin::upload');

    // TODO(upload-atomicity): True delete atomicity needs a persisted operation/tombstone and
    // reconciliation; arbitrary providers and the database cannot participate in one shared
    // transaction.
    if (file.provider === config.provider) {
      const mainFileOutcomes = await settleStorageOperations([
        {
          name: 'delete:original',
          file,
          run: () => strapi.plugin('upload').provider.delete(file),
        },
      ]);
      const mainFileFailures = getFailedStorageOperations(mainFileOutcomes);

      if (mainFileFailures.length > 0) {
        logStorageOperationFailure(
          'Failed to delete the original media object; formats and database record were retained',
          'delete-original',
          mainFileOutcomes,
          { assetId: file.id, provider: file.provider, databaseDeleted: false }
        );
        throwFirstStorageOperationError(mainFileFailures);
      }

      if (file.formats) {
        const formatOutcomes = await settleStorageOperations(
          Object.entries(file.formats).map(([key, format]) => ({
            name: `delete:format:${key}`,
            file: format as File,
            run: () => strapi.plugin('upload').provider.delete(format),
          }))
        );
        const formatFailures = getFailedStorageOperations(formatOutcomes);

        if (formatFailures.length > 0) {
          logStorageOperationFailure(
            'Media deletion partially completed; the original and some formats were deleted but the database record was retained',
            'delete-formats',
            formatOutcomes,
            { assetId: file.id, provider: file.provider, databaseDeleted: false }
          );
          throwFirstStorageOperationError(formatFailures);
        }
      }
    } else {
      strapi.log.warn('Skipped media storage deletion because its provider is not active', {
        assetId: file.id,
        fileProvider: file.provider,
        activeProvider: config.provider,
      });
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
    _replaceImage: replaceImage,
  };
};
