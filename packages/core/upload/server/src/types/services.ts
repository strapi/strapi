import type { queryParams } from '@strapi/utils';
import type upload from '../services/upload';
import type { Config, File, Folder, UploadableFile, UploadInputFile } from '../types';
import type imageManipulation from '../services/image-manipulation';
import type apiUploadFolder from '../services/api-upload-folder';
import type provider from '../services/provider';
import type folder from '../services/folder';
import type file from '../services/file';
import type weeklyMetrics from '../services/weekly-metrics';
import type metrics from '../services/metrics';
import type extensions from '../services/extensions';
import type { createAIMetadataService } from '../services/ai-metadata';
import type { createAIMetadataJobsService } from '../services/ai-metadata-jobs';
import type { createAIMetadataProviderService } from '../services/ai-metadata-provider';
import type { AIMetadataJob } from '../../../shared/contracts/ai-metadata-jobs';

type UploadServiceImplementation = ReturnType<typeof upload>;

/** A page of files: the page result of the implementation, with its files typed. */
type FilesPage<TPage> = Omit<Awaited<TPage>, 'results'> & { results: File[] };

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
export type UploadService = Omit<
  UploadServiceImplementation,
  | 'upload'
  | 'replace'
  | 'updateFileInfo'
  | 'remove'
  | 'formatFileInfo'
  | 'getSettings'
  | 'setSettings'
  | 'getConfiguration'
  | 'setConfiguration'
  | 'findOne'
  | 'findMany'
  | 'findPage'
  | 'findAndCountPage'
> & {
  /** Uploads the files and stores one file row per file, in the order of `files`. */
  upload(
    input: { data: Record<string, unknown>; files: UploadInputFile[] },
    opts?: Parameters<UploadServiceImplementation['upload']>[1]
  ): Promise<File[]>;
  /**
   * Replaces the file's content, keeping its hash and extension so its URL does not change.
   * Rejects with a `NotFoundError` when no file has this ID.
   */
  replace(
    id: Parameters<UploadServiceImplementation['replace']>[0],
    input: {
      data: Parameters<UploadServiceImplementation['replace']>[1]['data'];
      file: UploadInputFile;
    },
    opts?: Parameters<UploadServiceImplementation['replace']>[2]
  ): Promise<File>;
  /**
   * Updates the file's name, alternative text, caption, focal point or folder. Rejects with a
   * `NotFoundError` when no file has this ID.
   */
  updateFileInfo(
    id: Parameters<UploadServiceImplementation['updateFileInfo']>[0],
    fileInfo: Parameters<UploadServiceImplementation['updateFileInfo']>[1],
    opts?: Parameters<UploadServiceImplementation['updateFileInfo']>[2]
  ): Promise<File>;
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
    ...rest: Parameters<UploadServiceImplementation['formatFileInfo']> extends [
      unknown,
      ...infer TRest,
    ]
      ? TRest
      : never
  ): ReturnType<UploadServiceImplementation['formatFileInfo']>;
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
  findOne(
    id: Parameters<UploadServiceImplementation['findOne']>[0],
    populate?: queryParams.Params['populate']
  ): Promise<File | null>;
  /**
   * The matching files. `pagination` is ignored: pass flat `start` and `limit` to page. With
   * `fields`, a file has only the selected fields, its `id` and its `documentId`.
   */
  findMany(query?: FilesQuery): Promise<File[]>;
  /**
   * A page of the matching files, from flat `page` and `pageSize`. With `fields`, a file has only
   * the selected fields, its `id` and its `documentId`.
   */
  findPage(
    query?: queryParams.Params
  ): Promise<FilesPage<ReturnType<UploadServiceImplementation['findPage']>>>;
  /**
   * A page of the matching files, from the nested `pagination` and the `api.rest` limits. Without
   * the count, `pagination` has no `total` or `pageCount`. With `fields`, a file has only the
   * selected fields, its `id` and its `documentId`.
   */
  findAndCountPage(
    query?: FilesQuery
  ): Promise<FilesPage<ReturnType<UploadServiceImplementation['findAndCountPage']>>>;
};

type MetricsServiceImplementation = ReturnType<typeof metrics>;

/** The registered `metrics` service: sends the upload telemetry events. */
export type MetricsService = Omit<MetricsServiceImplementation, 'trackUsage'> & {
  /**
   * Sends a telemetry event. `properties.eventProperties` also gets whether AI metadata is enabled,
   * when an AI provider is available. Resolves to `false` when the event is rate limited or the
   * request fails, and to `true` when telemetry is disabled.
   *
   * @internal
   */
  trackUsage(
    event: string,
    properties?: Record<string, unknown>
  ): ReturnType<MetricsServiceImplementation['trackUsage']>;
};

type AIMetadataJobsServiceImplementation = ReturnType<typeof createAIMetadataJobsService>;

/**
 * An AI metadata job as the database reads it back: dates are ISO strings, and `completedAt` is
 * `null` until the job completes or fails.
 */
export type AIMetadataJobRow = {
  id: number;
  status: AIMetadataJob['status'];
  createdAt: string;
  completedAt: string | null;
};

/** The registered `aiMetadataJobs` service: tracks the AI metadata backfill jobs. */
export type AIMetadataJobsService = Omit<
  AIMetadataJobsServiceImplementation,
  'getJob' | 'getLatestActiveJob'
> & {
  /**
   * The job with this ID, or `null` when there is none.
   *
   * @internal
   */
  getJob(jobId: number): Promise<AIMetadataJobRow | null>;
  /**
   * The most recently created job, whatever its status, or `null` when no job exists.
   *
   * @internal
   */
  getLatestActiveJob(): Promise<AIMetadataJobRow | null>;
};

type FolderServiceImplementation = typeof folder;

/** A folder of the media library tree. Children are sorted by name. */
export type FolderStructureNode = {
  id: number;
  name: string;
  children: FolderStructureNode[];
};

/** The registered `folder` service: creates, moves and deletes media library folders. */
export type FolderService = Omit<
  FolderServiceImplementation,
  'create' | 'update' | 'deleteByIds' | 'setPathIdAndPath' | 'getStructure'
> & {
  /**
   * Creates a folder under `parent`, or at the root without one. The creator fields are set when a
   * user is passed.
   *
   * @internal
   */
  create(
    folderData: Parameters<FolderServiceImplementation['create']>[0],
    opts?: Parameters<FolderServiceImplementation['create']>[1]
  ): Promise<Folder>;
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
    opts: Parameters<FolderServiceImplementation['update']>[2]
  ): Promise<Folder | undefined>;
  /**
   * Deletes the folders, their subfolders and every file they hold.
   *
   * @returns the deleted folders, without their subfolders, and how many folders and files were
   * deleted in total.
   * @internal
   */
  deleteByIds(
    ids?: Parameters<FolderServiceImplementation['deleteByIds']>[0],
    opts?: Parameters<FolderServiceImplementation['deleteByIds']>[1]
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

type APIUploadFolderServiceImplementation = typeof apiUploadFolder;

/** The registered `api-upload-folder` service: the folder that Content API uploads go to. */
export type APIUploadFolderService = Omit<
  APIUploadFolderServiceImplementation,
  'getAPIUploadFolder'
> & {
  /**
   * The folder that Content API uploads go to. It is created at the root on first use, and again
   * when it was deleted.
   *
   * @internal
   */
  getAPIUploadFolder(): Promise<Folder>;
};

type FileServiceImplementation = typeof file;

/** The registered `file` service: file paths, URL signing and file deletion. */
export type FileService = Omit<FileServiceImplementation, 'getFolderPath' | 'deleteByIds'> & {
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
};

type ProviderServiceImplementation = ReturnType<typeof provider>;

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
export type ProviderService = Omit<ProviderServiceImplementation, 'replace'> & {
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
       * `media-folder.delete` passes every deleted folder, nested ones included.
       */
      interface Events {
        'media.create': [{ media: File }];
        'media.update': [{ media: File }];
        'media.delete': [{ media: File }];
        'media-folder.create': [{ folder: Folder }];
        'media-folder.update': [{ folder: Folder }];
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
