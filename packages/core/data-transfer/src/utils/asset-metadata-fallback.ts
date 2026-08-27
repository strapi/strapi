import path from 'path';

import { lookup as lookupMimeType } from 'mime-types';
import { file as fileUtils } from '@strapi/utils';

import type { IFile } from '../types';

const { bytesToKbytes } = fileUtils;

export const ASSET_SIDECAR_METADATA_FALLBACK_KEY = 'metadataFallback';

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
    mime: lookupMimeType(filename) || 'application/octet-stream',
    size: bytesToKbytes(stats.size),
    url: ext ? `/${hash}${ext}` : `/${hash}`,
  };
};

export const missingAssetMetadataSidecarMessage = (filename: string): string =>
  `[Data transfer] Missing asset metadata sidecar for "${filename}"; using filename-derived fallback metadata. File bytes will still be transferred.`;

export class MissingArchiveEntryError extends Error {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`File "${filePath}" not found`);
    this.name = 'MissingArchiveEntryError';
    this.filePath = filePath;
  }
}

/**
 * True when asset metadata sidecar loading failed because the sidecar is absent.
 * Directory sources surface `ENOENT`; tar/file sources use a typed missing-entry error.
 * Other failures (malformed JSON, permissions, I/O) must abort the transfer.
 */
export const isMissingAssetMetadataSidecarError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    return true;
  }

  return error instanceof MissingArchiveEntryError;
};

export const serializeAssetSidecar = (asset: {
  metadata: IFile;
  metadataFallback?: boolean;
}): string =>
  JSON.stringify(
    asset.metadataFallback
      ? { ...asset.metadata, [ASSET_SIDECAR_METADATA_FALLBACK_KEY]: true }
      : asset.metadata
  );

export const parseAssetSidecar = (raw: unknown): { metadata: IFile; metadataFallback: boolean } => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('Asset sidecar metadata must be a JSON object');
  }

  const record = raw as IFile & { metadataFallback?: unknown };
  const { metadataFallback, ...metadata } = record;

  return {
    metadata: metadata as IFile,
    metadataFallback: metadataFallback === true,
  };
};
