import provider from './provider';
import upload from './upload';
import imageManipulation from './image-manipulation';
import folder from './folder';
import file from './file';
import weeklyMetrics from './weekly-metrics';
import metrics from './metrics';
import apiUploadFolder from './api-upload-folder';
import extensions from './extensions';

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
};
