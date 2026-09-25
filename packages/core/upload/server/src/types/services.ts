import type upload from '../services/upload';
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

/** Upload services by name, as registered by the plugin. */
export type Services = {
  upload: ReturnType<typeof upload>;
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
