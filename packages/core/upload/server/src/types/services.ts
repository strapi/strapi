import type upload from '../services/upload';
import type { Config, UploadInputFile } from '../types';
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
  folder: typeof folder;
  file: typeof file;
  weeklyMetrics: ReturnType<typeof weeklyMetrics>;
  metrics: ReturnType<typeof metrics>;
  'api-upload-folder': typeof apiUploadFolder;
  extensions: typeof extensions;
  aiMetadata: ReturnType<typeof createAIMetadataService>;
  aiMetadataJobs: ReturnType<typeof createAIMetadataJobsService>;
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
