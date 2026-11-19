import type { Core } from '@strapi/types';
import type {} from '../types';

import provider from './provider';
import upload from './upload';
import imageManipulation from './image-manipulation';
import folder from './folder';
import file from './file';
import weeklyMetrics from './weekly-metrics';
import metrics from './metrics';
import apiUploadFolder from './api-upload-folder';
import extensions from './extensions';
import { createAIMetadataService } from './ai-metadata';
import { createAIMetadataJobsService } from './ai-metadata-jobs';
import { createAIMetadataProviderService } from './ai-metadata-provider';

/** Names of the registered Upload services. */
type RegisteredNames = keyof Core.RegisteredFor<
  Strapi.Registries.PackageServices,
  'plugin::upload'
>;

export const services = {
  provider,
  upload,
  folder,
  file,
  weeklyMetrics,
  metrics,
  'image-manipulation': imageManipulation,
  'api-upload-folder': apiUploadFolder,
  extensions,
  aiMetadata: createAIMetadataService,
  aiMetadataJobs: createAIMetadataJobsService,
  aiMetadataProvider: createAIMetadataProviderService,
} satisfies Record<RegisteredNames, unknown>;
