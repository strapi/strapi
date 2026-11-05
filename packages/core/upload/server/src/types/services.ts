import type { pagination, queryParams } from '@strapi/utils';
import type { Config, File, FileInfo, Folder, UploadableFile, UploadInputFile } from '../types';
import type imageManipulation from '../services/image-manipulation';
import type { FetchUrlResult, UrlFetchProgress } from '../services/file';
import type weeklyMetrics from '../services/weekly-metrics';
import type extensions from '../services/extensions';
import type { createAIMetadataService } from '../services/ai-metadata';
import type { createAIMetadataProviderService } from '../services/ai-metadata-provider';
import type { AIMetadataJob } from '../../../shared/contracts/ai-metadata-jobs';

/** The options of the upload service's writes. */
export type UploadOptions = {
  /** The admin user the write is made for; it becomes the file's `createdBy` or `updatedBy`. */
  user?: { id: string | number };
};

/** Where an uploaded file is attached, and the folder it is staged in. */
export type FileMetas = {
  refId?: string | number;
  ref?: string;
  field?: string;
  path?: string;
  tmpWorkingDirectory?: string;
};

/** The `data` of a file replacement: the new file information and where the file is attached. */
export type ReplaceData = { fileInfo: FileInfo } & FileMetas;

/** A page of files from `findPage`, with page-based pagination information. */
export type FilesPage = {
  results: File[];
  pagination: { page: number; pageSize: number; pageCount: number; total: number };
};

/**
 * A page of files from `findAndCountPage`. Without the count, `pagination` has no `total` or
 * `pageCount`.
 */
export type CountedFilesPage = {
  results: File[];
  pagination: Partial<
    pagination.PagePatinationInformation | pagination.OffsetPaginationInformation
  >;
};

/**
 * A query of the upload service's file reads: the REST query params, with the Content API's nested
 * `pagination`. Query string values arrive as strings. Page (`page`, `pageSize`) and offset
 * (`start`, `limit`) notations cannot be mixed.
 */
export type FilesQuery = queryParams.Params & {
  pagination?: {
    page?: number | string;
    pageSize?: number | string;
    start?: number | string;
    limit?: number | string;
    /**
     * `true`, `1`, `'true'`, `'t'` and `'1'` count the files; `false`, `0`, `'false'`, `'f'` and
     * `'0'` skip the count; any other string is rejected. Defaults to `api.rest.withCount`.
     */
    withCount?: boolean | 0 | 1 | string;
  };
};

/**
 * The registered `upload` service. The service reads only the {@link UploadInputFile} fields of the
 * files it receives, so hand-built files are accepted too. The implementation keeps its published
 * formidable `InputFile` parameters, which strict types would otherwise widen for every application.
 *
 * Files are `plugin::upload.file` rows. Writes return the stored row without its relations. Reads
 * add `isUrlSigned`, and carry `folder`, `related`, `createdBy` and `updatedBy` only when
 * populated.
 */
export type UploadService = {
  /** Uploads the files and stores one file row per file, in the order of `files`. */
  upload(
    input: { data: Record<string, unknown>; files: UploadInputFile[] },
    opts?: UploadOptions
  ): Promise<File[]>;
  /**
   * Replaces the file's content, keeping its hash and extension so its URL does not change.
   * Rejects with a `NotFoundError` when no file has this ID.
   */
  replace(
    id: string | number,
    input: { data: ReplaceData; file: UploadInputFile },
    opts?: UploadOptions
  ): Promise<File>;
  /**
   * Updates the file's name, alternative text, caption, focal point or folder. Rejects with a
   * `NotFoundError` when no file has this ID.
   */
  updateFileInfo(id: string | number, fileInfo: FileInfo, opts?: UploadOptions): Promise<File>;
  /**
   * Deletes the file and its formats from the provider when they are stored with the configured
   * provider, then deletes its row.
   *
   * @returns the deleted row, or `null` when the row was already deleted.
   */
  remove(file: File): Promise<File | null>;
  /** A missing name (formidable's nullable `originalFilename`) is rejected as an invalid name. */
  formatFileInfo(
    file: { filename: string | null | undefined; type: string; size: number },
    fileInfo?: Partial<FileInfo>,
    metas?: FileMetas
  ): Promise<Omit<UploadableFile, 'getStream'>>;
  /**
   * The stored media library settings, or `null` before they are first stored. Settings saved
   * without `aiMetadata` or `autoOrientation` are stored without them.
   */
  getSettings(): Promise<Strapi.Registries.Stores['plugin_upload_settings'] | null>;
  /** Replaces the stored media library settings and sends the responsive dimensions telemetry event. */
  setSettings(value: Strapi.Registries.Stores['plugin_upload_settings']): Promise<void>;
  /** The stored media library view configuration, or `null` before it is first stored. */
  getConfiguration(): Promise<Strapi.Registries.Stores['plugin_upload_view_configuration'] | null>;
  /** Replaces the stored media library view configuration. */
  setConfiguration(
    value: Strapi.Registries.Stores['plugin_upload_view_configuration']
  ): Promise<void>;
  /** The file with this ID, or `null` when there is none. */
  findOne(id: string | number, populate?: queryParams.Params['populate']): Promise<File | null>;
  /**
   * The matching files. `pagination` is ignored: pass flat `start` and `limit` to page. With
   * `fields`, a file has only the selected fields, its `id` and its `documentId`.
   */
  findMany(query?: FilesQuery): Promise<File[]>;
  /**
   * A page of the matching files, from flat `page` and `pageSize`. With `fields`, a file has only
   * the selected fields, its `id` and its `documentId`.
   */
  findPage(query?: queryParams.Params): Promise<FilesPage>;
  /**
   * A page of the matching files, from the nested `pagination` and the `api.rest` limits. Without
   * the count, `pagination` has no `total` or `pageCount`. With `fields`, a file has only the
   * selected fields, its `id` and its `documentId`.
   */
  findAndCountPage(query?: FilesQuery): Promise<CountedFilesPage>;
  /**
   * Uploads the image with its dimensions and generated formats. Exposed for testing only.
   *
   * @internal
   */
  _uploadImage(fileData: UploadableFile): Promise<void>;
  /**
   * Replaces the stored image and its formats with this image and its generated formats. Exposed
   * for testing only.
   *
   * @internal
   */
  _replaceImage(fileData: UploadableFile, oldFile: File): Promise<void>;
  /**
   * Queues a provider operation, with its rejection handled in the same turn. Exposed for testing
   * only.
   *
   * @internal
   */
  _queueConcurrentOperation<T>(queue: Promise<T>[], operation: Promise<T>): void;
};

/** The registered `metrics` service: sends the upload telemetry events. */
export type MetricsService = {
  /**
   * Sends a telemetry event. `properties.eventProperties` also gets whether AI metadata is enabled,
   * when an AI provider is available. Resolves to `false` when the event is rate limited or the
   * request fails, and to `true` when telemetry is disabled.
   *
   * @internal
   */
  trackUsage(
    event: string,
    properties?: {
      eventProperties?: Record<string, unknown>;
      groupProperties?: Record<string, unknown>;
    } & Record<string, unknown>
  ): Promise<boolean>;
  /**
   * Sends the `didInitializePluginUpload` telemetry event with the provider name and privacy.
   *
   * @internal
   */
  sendUploadPluginMetrics(): Promise<void>;
};

/**
 * An AI metadata job as the database reads it back: dates are ISO strings, and `completedAt` is
 * `null` until the job completes or fails.
 */
export type AIMetadataJobRow = AIMetadataJob;

/**
 * The fields `updateJob` writes: the status, the completion date, or both. Dates are written as
 * `Date` instances and read back as ISO strings.
 */
export type AIMetadataJobUpdate = Partial<Pick<AIMetadataJob, 'status'> & { completedAt: Date }>;

/** The registered `aiMetadataJobs` service: tracks the AI metadata backfill jobs. */
export type AIMetadataJobsService = {
  /**
   * Creates a `processing` job and resolves its ID.
   *
   * @internal
   */
  createJob(): Promise<number>;
  /**
   * The job with this ID, or `null` when there is none.
   *
   * @internal
   */
  getJob(jobId: number): Promise<AIMetadataJobRow | null>;
  /**
   * Updates the status or the completion date of a job.
   *
   * @internal
   */
  updateJob(jobId: number, updates: AIMetadataJobUpdate): Promise<void>;
  /**
   * Deletes a job.
   *
   * @internal
   */
  deleteJob(jobId: number): Promise<void>;
  /**
   * The most recently created job, whatever its status, or `null` when no job exists.
   *
   * @internal
   */
  getLatestActiveJob(): Promise<AIMetadataJobRow | null>;
};

/** A folder of the media library tree. Children are sorted by name. */
export type FolderStructureNode = {
  id: number;
  name: string;
  children: FolderStructureNode[];
};

/** The options of a folder write made for an admin user. */
export type FolderWriteOptions = {
  /** The admin user the write is made for; it becomes the folder's `createdBy` or `updatedBy`. */
  user: { id: string | number };
};

/** The options of `deleteByIds`. */
export type FolderDeleteOptions = {
  /** Called with every file the deletion removes, before anything is deleted. */
  validateFiles?: (files: File[]) => Promise<void>;
};

/** The registered `folder` service: creates, moves and deletes media library folders. */
export type FolderService = {
  /**
   * Whether a folder matches these `where` parameters.
   *
   * @internal
   */
  exists(params?: NonNullable<unknown>): Promise<boolean>;
  /**
   * Creates a folder under `parent`, or at the root without one. The creator fields are set when a
   * user is passed.
   *
   * @internal
   */
  create(folderData: Pick<Folder, 'name' | 'parent'>, opts?: FolderWriteOptions): Promise<Folder>;
  /**
   * Renames or moves a folder. Moving it rewrites the paths of its descendant folders and files.
   * Resolves to `undefined` when a rename finds no folder with this ID.
   *
   * @internal
   */
  update(
    id: number | string,
    data: {
      name?: string;
      /**
       * Omit to rename in place: the name-only branch skips the transaction that rewrites
       * descendant paths. Pass a number to re-parent, or null to move to the root.
       */
      parent?: number | null;
    },
    opts: FolderWriteOptions
  ): Promise<Folder | undefined>;
  /**
   * Deletes the folders, their subfolders and every file they hold.
   *
   * @returns the deleted folders, without their subfolders, and how many folders and files were
   * deleted in total.
   * @internal
   */
  deleteByIds(
    ids?: number[],
    opts?: FolderDeleteOptions
  ): Promise<{ folders: Folder[]; totalFolderNumber: number; totalFileNumber: number }>;
  /**
   * Sets the next `pathId` and the matching `path` on the folder, which is changed in place and
   * returned.
   *
   * @internal
   */
  setPathIdAndPath<TFolder extends { name?: string; parent?: number | null }>(
    folder: TFolder
  ): Promise<TFolder & { pathId: number; path: string }>;
  /**
   * The root folders, each with its subfolders.
   *
   * @internal
   */
  getStructure(): Promise<FolderStructureNode[]>;
};

/** The registered `api-upload-folder` service: the folder that Content API uploads go to. */
export type APIUploadFolderService = {
  /**
   * The folder that Content API uploads go to. It is created at the root on first use, and again
   * when it was deleted.
   *
   * @internal
   */
  getAPIUploadFolder(): Promise<Folder>;
};

/** The registered `file` service: file paths, URL signing and file deletion. */
export type FileService = {
  /**
   * The path of the folder with this ID, or `/` without one. Rejects when no folder has this ID.
   *
   * @internal
   */
  getFolderPath(folderId?: number | null): Promise<string>;
  /**
   * Deletes the files with these IDs, from the provider too.
   *
   * @returns the deleted file rows, without their relations.
   * @internal
   */
  deleteByIds(ids?: number[]): Promise<File[]>;
  signFileUrls: (file: File) => Promise<File>;
  /**
   * Streams a URL to a temporary file for the upload pipeline.
   *
   * @internal
   */
  fetchUrlToInputFile: (
    url: string,
    tmpWorkingDirectory: string,
    sizeLimit?: number,
    onProgress?: (progress: UrlFetchProgress) => void
  ) => Promise<FetchUrlResult>;
};

/**
 * One entry of a file's `formats` (`thumbnail`, `small`, `medium`, `large`): a resized copy of the
 * image, stored on the file row. It has no ID of its own.
 */
export type FileFormat = {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  /** The `path` sent with the upload, or null without one */
  path: string | null;
  width: number;
  height: number;
  /** In kilobytes */
  size: number;
  sizeInBytes: number;
  url: string;
};

/** The registered `provider` service: sends files to the configured upload provider. */
export type ProviderService = {
  /**
   * Passes the file and the configured `sizeLimit` to the provider's own size check.
   *
   * @internal
   */
  checkFileSize(file: UploadableFile): Promise<void>;
  /**
   * Sends the file to the provider, as a stream when the provider supports it, as a buffer
   * otherwise. The provider sets the file's `url`.
   *
   * @internal
   */
  upload(file: UploadableFile): Promise<void>;
  /**
   * Replaces the old file with the new one at the provider. A provider without `replace` gets a
   * delete of the old file, then an upload of the new one. The old file is a file row, or one of
   * its formats when an image format is replaced.
   *
   * @internal
   */
  replace(newFile: UploadableFile, oldFile: File | FileFormat): Promise<void>;
};

/**
 * `strapi.config.get('plugin::upload')`: the plugin config merged with its defaults. `breakpoints`
 * defaults to the responsive image sizes when it is not set.
 */
export type UploadConfig = Omit<Config, 'providerOptions'> & {
  /** `localServer` holds the `koa-static` options of the local provider's files route. */
  providerOptions: Record<string, unknown> & { localServer?: Record<string, unknown> };
  enabled: boolean;
  sizeLimit: number;
  breakpoints?: Record<string, number>;
};

/** Upload services by name, as registered by the plugin. */
export type Services = {
  upload: UploadService;
  'image-manipulation': typeof imageManipulation;
  provider: ProviderService;
  folder: FolderService;
  file: FileService;
  weeklyMetrics: ReturnType<typeof weeklyMetrics>;
  metrics: MetricsService;
  'api-upload-folder': APIUploadFolderService;
  extensions: typeof extensions;
  aiMetadata: ReturnType<typeof createAIMetadataService>;
  aiMetadataJobs: AIMetadataJobsService;
  aiMetadataProvider: ReturnType<typeof createAIMetadataProviderService>;
};

/** Default contracts loaded with the Upload server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageConfigs {
        'plugin::upload': UploadConfig;
      }

      /**
       * The upload rows of the core store. `settings` and `view_configuration` are completed with
       * their defaults at every start. `metrics` holds the weekly metrics cron schedule, missing until
       * it first runs (`lastWeeklyUpdate` is a timestamp in milliseconds). `api-folder` holds the ID of
       * the folder that API uploads go to. `media_library_default_notice` records that the Media
       * Library notice was logged.
       */
      interface Stores {
        plugin_upload_settings: {
          sizeOptimization: boolean;
          responsiveDimensions: boolean;
          autoOrientation?: boolean | undefined;
          aiMetadata?: boolean | undefined;
        };
        plugin_upload_view_configuration: { pageSize: number; sort?: string | undefined };
        plugin_upload_metrics: { lastWeeklyUpdate?: number; weeklySchedule?: string };
        'plugin_upload_api-folder': { id: number };
        plugin_upload_media_library_default_notice: { shown: boolean };
      }

      /**
       * Events the upload plugin emits on the event hub, also forwarded to webhooks. `media` is the
       * file sanitized as a default output (private fields removed), `folder` the folder row.
       * `media-folder.update` also passes the folder as it was before the update, `null` when it was
       * not found. `media-folder.delete` passes every deleted folder, nested ones included.
       */
      interface Events {
        'media.create': [{ media: File }];
        'media.update': [{ media: File }];
        'media.delete': [{ media: File }];
        'media-folder.create': [{ folder: Folder }];
        'media-folder.update': [{ folder: Folder; previous?: Folder | null }];
        'media-folder.delete': [{ folders: Folder[] }];
      }

      interface PackageServices {
        'plugin::upload.aiMetadata': Services['aiMetadata'];
        'plugin::upload.aiMetadataJobs': Services['aiMetadataJobs'];
        'plugin::upload.aiMetadataProvider': Services['aiMetadataProvider'];
        'plugin::upload.api-upload-folder': Services['api-upload-folder'];
        'plugin::upload.extensions': Services['extensions'];
        'plugin::upload.file': Services['file'];
        'plugin::upload.folder': Services['folder'];
        'plugin::upload.image-manipulation': Services['image-manipulation'];
        'plugin::upload.metrics': Services['metrics'];
        'plugin::upload.provider': Services['provider'];
        'plugin::upload.upload': Services['upload'];
        'plugin::upload.weeklyMetrics': Services['weeklyMetrics'];
      }

      /** Registered at bootstrap (`bootstrap.ts`). */
      interface PermissionActions {
        'plugin::upload.read': true;
        'plugin::upload.assets.create': true;
        'plugin::upload.assets.update': true;
        'plugin::upload.assets.download': true;
        'plugin::upload.assets.copy-link': true;
        'plugin::upload.configure-view': true;
        'plugin::upload.settings.read': true;
      }
    }
  }
}
