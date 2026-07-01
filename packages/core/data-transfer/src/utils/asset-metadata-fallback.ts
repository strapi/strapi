import path from 'path';

import { file as fileUtils } from '@strapi/utils';

import type { IFile } from '../types';

const { bytesToKbytes } = fileUtils;

const MIME_BY_EXT: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const guessMimeFromExt = (ext: string): string => {
  const normalized = ext.toLowerCase();
  return MIME_BY_EXT[normalized] ?? 'application/octet-stream';
};

/**
 * Build minimal upload metadata when an export sidecar JSON is missing.
 * Strapi export uploads are named `{hash}{ext}`; bytes are still transferred unchanged.
 */
export const buildFallbackAssetMetadataFromFilename = (
  filename: string,
  stats: { size: number }
): IFile => {
  const ext = path.extname(filename);
  const hash = ext ? filename.slice(0, -ext.length) : filename;

  return {
    id: 0,
    name: filename,
    hash,
    ext: ext || undefined,
    mime: guessMimeFromExt(ext),
    size: bytesToKbytes(stats.size),
    url: ext ? `/${hash}${ext}` : `/${hash}`,
  };
};

export const missingAssetMetadataSidecarMessage = (filename: string): string =>
  `[Data transfer] Missing asset metadata sidecar for "${filename}"; using filename-derived fallback metadata. File bytes will still be transferred.`;
