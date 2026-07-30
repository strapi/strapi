import type { Core } from '@strapi/types';
import { InputFile } from '../types';

/**
 * Fetches an image from a URL and returns it as a Blob
 */
async function fetchImageAsBlob(
  file: InputFile,
  serverAbsoluteUrl: string,
  logger: Core.Strapi['log']
): Promise<Blob> {
  const fullUrl = file.provider === 'local' ? serverAbsoluteUrl + file.filepath : file.filepath;

  const resp = await fetch(fullUrl);
  if (!resp.ok) {
    logger.error('Failed to fetch image', {
      fullUrl,
      status: resp.status,
      statusText: resp.statusText,
    });
    throw new Error(`Failed to fetch image from URL: ${fullUrl} (${resp.status})`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  return new Blob([arrayBuffer], { type: file.mimetype || undefined });
}

/**
 * Builds FormData from an array of input files by fetching each image
 */
export async function buildFormDataFromFiles(
  files: InputFile[],
  serverAbsoluteUrl: string,
  logger: Core.Strapi['log']
): Promise<FormData> {
  const formData = new FormData();

  for (const file of files) {
    const blob = await fetchImageAsBlob(file, serverAbsoluteUrl, logger);
    formData.append('files', blob);
  }

  return formData;
}
