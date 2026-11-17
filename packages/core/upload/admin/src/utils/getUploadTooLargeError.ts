import { UploadFileError } from '../services/uploadFileViaXHR';

import type { UploadTooLargeDetails } from '../../../shared/contracts/files';

/**
 * Which limit rejected an upload as too large:
 * - `requestLimit`: `formidable.maxFileSize` on the `strapi::body` middleware
 * - `sizeLimit`: `upload.config.sizeLimit`, or the deprecated `setting` when that applied
 * - `external`: a 413 that Strapi did not send, so something in front of Strapi
 *
 * `limit` is in bytes. Plain data so it can sit in the upload progress store.
 */
export type UploadTooLargeError =
  | { reason: 'requestLimit'; limit: number }
  | {
      reason: 'sizeLimit';
      limit: number;
      setting?: Extract<UploadTooLargeDetails, { code: 'SizeLimitExceeded' }>['setting'];
    }
  | { reason: 'external' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isUploadTooLargeDetails = (details: unknown): details is UploadTooLargeDetails =>
  isRecord(details) &&
  (details.code === 'FileTooBig' || details.code === 'SizeLimitExceeded') &&
  typeof details.limit === 'number';

/**
 * Every 413 Strapi sends, from `strapi::body` or a thrown `PayloadTooLargeError`, carries an
 * error envelope named `PayloadTooLargeError`.
 */
const isStrapiPayloadTooLarge = (error: Record<string, unknown>) =>
  (error instanceof UploadFileError ? error.errorName : error.name) === 'PayloadTooLargeError';

/**
 * Reads a too-large rejection out of an upload error: an `UploadFileError` from the XHR
 * upload, an RTK Query error, or an SSE `file:error` payload.
 */
export const getUploadTooLargeError = (error: unknown): UploadTooLargeError | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  const { details } = error;

  if (isUploadTooLargeDetails(details)) {
    if (details.code === 'FileTooBig') {
      return { reason: 'requestLimit', limit: details.limit };
    }

    return details.setting === 'upload.config.providerOptions.sizeLimit'
      ? { reason: 'sizeLimit', limit: details.limit, setting: details.setting }
      : { reason: 'sizeLimit', limit: details.limit };
  }

  if (error.status === 413 && !isStrapiPayloadTooLarge(error)) {
    return { reason: 'external' };
  }

  return undefined;
};

/**
 * Same output as `bytesToHumanReadable` in `@strapi/utils`, which the server uses for these
 * limits, so the admin and the server logs show the same value.
 */
export const formatSizeLimit = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  if (bytes === 0) {
    return '0 Bytes';
  }

  const i = Math.floor(Math.log(bytes) / Math.log(1000));

  return `${Math.round(bytes / 1000 ** i)} ${sizes[i]}`;
};
