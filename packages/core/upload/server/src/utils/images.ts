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
 * Fetches every input file as a Blob, in order. Sequential on purpose (same as before).
 */
export async function fetchImagesAsBlobs(
  files: InputFile[],
  serverAbsoluteUrl: string,
  logger: Core.Strapi['log']
): Promise<Blob[]> {
  const blobs: Blob[] = [];

  for (const file of files) {
    blobs.push(await fetchImageAsBlob(file, serverAbsoluteUrl, logger));
  }

  return blobs;
}
