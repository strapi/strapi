import path from 'path';
import dns from 'dns/promises';
import net from 'net';
import fse from 'fs-extra';
import { cloneDeep } from 'lodash/fp';
import { async, errors } from '@strapi/utils';

import { FOLDER_MODEL_UID, FILE_MODEL_UID } from '../constants';
import { getService } from '../utils';

import { Config, type File } from '../types';

const { ApplicationError } = errors;

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
 * Fetches a URL and saves it as a temporary file
 * Returns an InputFile-compatible object for use with the upload pipeline
 */
const fetchUrlToInputFile = async (
  url: string,
  tmpWorkingDirectory: string,
  sizeLimit?: number
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

  // Fetch the URL with timeout
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
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

  // Check Content-Length header for early rejection of large files
  if (sizeLimit) {
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > sizeLimit) {
      throw new ApplicationError(
        `File too large: maximum allowed size is ${Math.round(sizeLimit / (1024 * 1024))}MB`
      );
    }
  }

  // Get content type and filename
  const contentType =
    response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
  const contentDisposition = response.headers.get('content-disposition');
  const filename = getFilenameFromUrl(response.url, contentDisposition);

  // Read response body
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Write to temp file
  const tmpFilePath = path.join(tmpWorkingDirectory, filename);
  await fse.writeFile(tmpFilePath, buffer);

  // Create file object compatible with upload pipeline
  const fetchedFile: UrlFetchedFile = {
    filepath: tmpFilePath,
    originalFilename: filename,
    mimetype: contentType,
    size: buffer.length,
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

export type { UrlFetchedFile, FetchUrlResult };
export default { getFolderPath, deleteByIds, signFileUrls, fetchUrlToInputFile };
