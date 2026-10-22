import type upload from '../services/upload';
import type { Config, File, Folder, UploadInputFile } from '../types';
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

/**
 * The registered `upload` service. The service reads only the {@link UploadInputFile} fields of the
 * files it receives, so hand-built files are accepted too. The implementation keeps its published
 * formidable `InputFile` parameters, which strict types would otherwise widen for every application.
 */
export type UploadService = Omit<
  UploadServiceImplementation,
  'upload' | 'replace' | 'formatFileInfo'
> & {
  upload(
    input: { data: Record<string, unknown>; files: UploadInputFile[] },
    opts?: Parameters<UploadServiceImplementation['upload']>[1]
  ): ReturnType<UploadServiceImplementation['upload']>;
  replace(
    id: Parameters<UploadServiceImplementation['replace']>[0],
    input: {
      data: Parameters<UploadServiceImplementation['replace']>[1]['data'];
      file: UploadInputFile;
    },
    opts?: Parameters<UploadServiceImplementation['replace']>[2]
  ): ReturnType<UploadServiceImplementation['replace']>;
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
export type FileService = Omit<FileServiceImplementation, 'getFolderPath'> & {
  /**
   * The path of the folder with this ID, or `/` without one. Rejects when no folder has this ID.
   *
   * @internal
   */
  getFolderPath(folderId?: number | null): Promise<string>;
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
  provider: ReturnType<typeof provider>;
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
    }
  }
}
