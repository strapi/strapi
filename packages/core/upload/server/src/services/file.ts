import path from 'path';
import dns from 'dns/promises';
import net from 'net';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import fse from 'fs-extra';
import { cloneDeep } from 'lodash/fp';
import { async, errors, file as fileUtils } from '@strapi/utils';

import { FOLDER_MODEL_UID, FILE_MODEL_UID } from '../constants';
import { getService } from '../utils';

import { Config, type File } from '../types';

const { ApplicationError } = errors;
const { bytesToHumanReadable } = fileUtils;

const FETCH_TIMEOUT_MS = 60_000; // 60 seconds

// Blocks loopback, link-local (cloud metadata), and RFC-1918 private ranges to prevent SSRF
const SSRF_BLOCK_LIST = new net.BlockList();
SSRF_BLOCK_LIST.addSubnet('127.0.0.0', 8); // loopback
SSRF_BLOCK_LIST.addSubnet('10.0.0.0', 8); // RFC-1918
SSRF_BLOCK_LIST.addSubnet('172.16.0.0', 12); // RFC-1918
SSRF_BLOCK_LIST.addSubnet('192.168.0.0', 16); // RFC-1918
SSRF_BLOCK_LIST.addSubnet('169.254.0.0', 16); // link-local / cloud metadata (AWS, GCP, Azure)
SSRF_BLOCK_LIST.addSubnet('::1', 128, 'ipv6'); // IPv6 loopback
SSRF_BLOCK_LIST.addSubnet('fc00::', 7, 'ipv6'); // IPv6 unique local
SSRF_BLOCK_LIST.addSubnet('fe80::', 10, 'ipv6'); // IPv6 link-local

/**
 * Represents a file fetched from a URL, compatible with the upload pipeline
 */
interface UrlFetchedFile {
  filepath: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  tmpWorkingDirectory?: string;
}

interface FetchUrlResult {
  file: UrlFetchedFile;
}

/**
 * Progress of a URL fetch.
 *
 * `bytesWritten` is cumulative and non-decreasing (the first report is always 0).
 * `totalBytes` is the parsed Content-Length when the header is present and valid, `null` otherwise.
 */
interface UrlFetchProgress {
  bytesWritten: number;
  totalBytes: number | null;
}

/**
 * Extracts filename from a URL path or Content-Disposition header
 */
const getFilenameFromUrl = (url: string, contentDisposition?: string | null): string => {
  // Try Content-Disposition header first
  if (contentDisposition) {
    // Extracts filename from Content-Disposition header (e.g. filename="photo.jpg" or filename*=UTF-8''photo.jpg)
    const filenameMatch = contentDisposition.match(
      /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i
    );
    if (filenameMatch?.[1]) {
      // Use path.basename to prevent path traversal attacks
      return path.basename(decodeURIComponent(filenameMatch[1]));
    }
  }

  // Fall back to URL path
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    if (filename && filename.length > 0) {
      // Use path.basename to prevent path traversal attacks (e.g., URL-encoded separators)
      return path.basename(decodeURIComponent(filename));
    }
  } catch {
    // Invalid URL, use default
  }

  // Generate a timestamp-based default filename
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // 2024-02-23
  const time = now.toTimeString().split(' ')[0].replace(/:/g, ''); // 143052
  return `untitled_${date}_${time}`;
};

/**
 * Fetches a URL and streams it to a temporary file
 * Returns an InputFile-compatible object for use with the upload pipeline
 *
 * The response body is never buffered in memory: it is piped straight to disk, so heap usage
 * stays bounded regardless of the remote file size. `sizeLimit` is enforced on the bytes actually
 * received, not only on the Content-Length header (which may be absent or wrong).
 *
 * `onProgress` (optional) reports raw progress:
 * - It fires **once immediately** with `{ bytesWritten: 0, totalBytes }` after the response headers
 *   are validated, before any bytes are read, so callers can size a progress bar up front.
 * - It then fires **once per streamed chunk** with cumulative `bytesWritten`.
 * - It is deliberately **not throttled**. Throttling is the caller's responsibility: a consumer
 *   that turns these into SSE frames should coalesce them to its own frame budget (a 512MB file at
 *   64KB chunks yields ~8000 calls). Throttling here would bake one consumer's frame rate into a
 *   shared service, and a pre-throttled counter cannot be un-throttled by a caller that needs
 *   every byte.
 * - If it throws, the error is logged and swallowed: reporting is observational, so a buggy
 *   consumer never fails the import.
 */
const fetchUrlToInputFile = async (
  url: string,
  tmpWorkingDirectory: string,
  sizeLimit?: number,
  onProgress?: (progress: UrlFetchProgress) => void
): Promise<FetchUrlResult> => {
  // Validate URL protocol
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ApplicationError(`Invalid URL: ${url}`);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new ApplicationError(`Invalid URL protocol. Only http and https are allowed: ${url}`);
  }

  // Resolve hostname and block private/internal IP ranges to prevent SSRF
  try {
    const { address, family } = await dns.lookup(parsedUrl.hostname);
    const type = family === 6 ? 'ipv6' : 'ipv4';
    if (SSRF_BLOCK_LIST.check(address, type)) {
      throw new ApplicationError(`URL resolves to a blocked address: ${url}`);
    }
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError(`Could not resolve hostname: ${parsedUrl.hostname}`);
  }

  // use strapi.fetch so we can intercept requests and support proxy settings
  const doFetch = typeof strapi?.fetch === 'function' ? strapi.fetch : fetch;
  let response: Response;
  try {
    response = await doFetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ApplicationError(`Request timed out while fetching URL: ${url}`);
    }
    throw error;
  }

  if (!response.ok) {
    throw new ApplicationError(
      `Failed to fetch URL: ${url} (${response.status} ${response.statusText})`
    );
  }

  const tooLargeError = () =>
    new ApplicationError(
      `File too large: maximum allowed size is ${bytesToHumanReadable(sizeLimit ?? 0)}`
    );

  const parsedContentLength = parseInt(response.headers.get('content-length') ?? '', 10);
  const totalBytes = Number.isFinite(parsedContentLength) ? parsedContentLength : null;

  // Check Content-Length header for early rejection of large files
  if (sizeLimit && totalBytes !== null && totalBytes > sizeLimit) {
    throw tooLargeError();
  }

  // Progress reporting is a side-channel for UI: a consumer that throws should not fail the import
  // it is merely observing. Node turns a synchronous throw inside `_transform` into a stream error,
  // so an unguarded callback would reject the pipeline and abort a download that was fine.
  const reportProgress = (progress: UrlFetchProgress) => {
    if (!onProgress) return;

    try {
      onProgress(progress);
    } catch (error) {
      strapi?.log?.warn(
        `URL fetch progress callback threw, ignoring: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  };

  // Announce the total before any bytes are dispatched. Consumers that size a progress bar from
  // `totalBytes` need it up front: a consumer clamping bytes to a not-yet-known size would clamp
  // every early chunk to zero. Fires exactly once, even when `totalBytes` is null or the body is
  // empty, so the first call is always a size announcement.
  reportProgress({ bytesWritten: 0, totalBytes });

  // Get content type and filename
  const contentType =
    response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
  const contentDisposition = response.headers.get('content-disposition');
  const filename = getFilenameFromUrl(response.url, contentDisposition);

  const tmpFilePath = path.join(tmpWorkingDirectory, filename);

  // Stream the response body to the temp file, counting bytes as they go so the size limit is
  // enforced even when Content-Length is missing or lying.
  let bytesWritten = 0;

  try {
    if (response.body === null) {
      // An empty body is valid per the fetch spec — write an empty file
      await fse.writeFile(tmpFilePath, '');
    } else {
      const counter = new Transform({
        transform(chunk, _encoding, callback) {
          bytesWritten += chunk.length;

          if (sizeLimit && bytesWritten > sizeLimit) {
            callback(tooLargeError());
            return;
          }

          // Raw, one call per chunk, no throttling — see `onProgress` on the signature above
          reportProgress({ bytesWritten, totalBytes });
          callback(null, chunk);
        },
      });

      await pipeline(
        Readable.fromWeb(response.body as WebReadableStream),
        counter,
        createWriteStream(tmpFilePath)
      );
    }
  } catch (error) {
    // Remove the partially written file — the caller only cleans up the temp directory once all
    // URLs have been processed. Cleanup failures must not replace the error the caller cares about
    // ("File too large", "socket hang up") with an incidental filesystem one, so swallow and log:
    // the request-level temp-directory cleanup is still the backstop for the leftover file.
    try {
      await fse.remove(tmpFilePath);
    } catch (cleanupError) {
      strapi?.log?.warn(
        `Could not remove partial temp file ${tmpFilePath}: ${
          cleanupError instanceof Error ? cleanupError.message : cleanupError
        }`
      );
    }

    throw error;
  }

  // Derive the size from the file on disk rather than from a buffer we never hold
  const { size } = await fse.stat(tmpFilePath);

  // Create file object compatible with upload pipeline
  const fetchedFile: UrlFetchedFile = {
    filepath: tmpFilePath,
    originalFilename: filename,
    mimetype: contentType,
    size,
    tmpWorkingDirectory,
  };

  return { file: fetchedFile };
};

const getFolderPath = async (folderId?: number | null) => {
  if (!folderId) return '/';

  const parentFolder = await strapi.db.query(FOLDER_MODEL_UID).findOne({ where: { id: folderId } });

  return parentFolder.path;
};

const deleteByIds = async (ids: number[] = []) => {
  const filesToDelete = await strapi.db
    .query(FILE_MODEL_UID)
    .findMany({ where: { id: { $in: ids } } });

  await Promise.all(filesToDelete.map((file: File) => getService('upload').remove(file)));

  return filesToDelete;
};

const signFileUrls = async (file: File) => {
  const { provider } = strapi.plugins.upload;
  const { provider: providerConfig } = strapi.config.get<Config>('plugin::upload');
  const isPrivate = await provider.isPrivate();
  file.isUrlSigned = false;

  // Check file provider and if provider is private
  if (file.provider !== providerConfig || !isPrivate) {
    return file;
  }

  const signUrl = async (file: File) => {
    const signedUrl = await provider.getSignedUrl(file);
    file.url = signedUrl.url;
    file.isUrlSigned = true;
  };

  const signedFile = cloneDeep(file);

  // Sign each file format
  await signUrl(signedFile);
  if (file.formats) {
    await async.map(Object.values(signedFile.formats ?? {}), signUrl);
  }

  return signedFile;
};

export type { UrlFetchedFile, FetchUrlResult, UrlFetchProgress };
export default { getFolderPath, deleteByIds, signFileUrls, fetchUrlToInputFile };
