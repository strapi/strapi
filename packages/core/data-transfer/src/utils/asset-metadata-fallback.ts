import path from 'path';

import { lookup as lookupMimeType } from 'mime-types';
import { file as fileUtils } from '@strapi/utils';

import type { IFile } from '../types';

const { bytesToKbytes } = fileUtils;

/**
 * Default upload responsive format prefixes (`thumbnail` plus DEFAULT_BREAKPOINTS).
 * Custom breakpoints cannot be known at fallback time (no Strapi config on the source).
 */
const RESPONSIVE_FORMAT_PREFIXES = ['thumbnail', 'large', 'medium', 'small'] as const;

export class MissingArchiveEntryError extends Error {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`File "${filePath}" not found`);
    this.name = 'MissingArchiveEntryError';
    this.filePath = filePath;
  }
}

const parseResponsiveFormatFromHash = (
  hash: string
): { type: (typeof RESPONSIVE_FORMAT_PREFIXES)[number]; mainHash: string } | undefined => {
  for (const format of RESPONSIVE_FORMAT_PREFIXES) {
    const prefix = `${format}_`;
    if (hash.startsWith(prefix) && hash.length > prefix.length) {
      return { type: format, mainHash: hash.slice(prefix.length) };
    }
  }

  return undefined;
};

/**
 * Build minimal upload metadata when an export sidecar JSON is missing.
 * Strapi export uploads are named `{hash}{ext}`; bytes are still transferred unchanged.
 * Responsive variants are named `{format}_{parentHash}{ext}` — recover `type`/`mainHash`
 * so the destination can update the parent media-library row.
 */
export const buildFallbackAssetMetadataFromFilename = (
  filename: string,
  stats: { size: number }
): IFile => {
  const ext = path.extname(filename);
  const hash = ext ? filename.slice(0, -ext.length) : filename;
  const format = parseResponsiveFormatFromHash(hash);

  return {
    id: 0,
    name: filename,
    hash,
    ext: ext || undefined,
    mime: lookupMimeType(filename) || 'application/octet-stream',
    size: bytesToKbytes(stats.size),
    url: ext ? `/${hash}${ext}` : `/${hash}`,
    ...(format ? { type: format.type, mainHash: format.mainHash } : {}),
  };
};

export const missingAssetMetadataSidecarMessage = (filename: string): string =>
  `[Data transfer] Missing asset metadata sidecar for "${filename}"; using filename-derived fallback metadata. File bytes will still be transferred.`;
