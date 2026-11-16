import { UploadFileError } from '../services/uploadFileViaXHR';

/**
 * Which limit rejected an upload as too large:
 * - `requestLimit`: `formidable.maxFileSize` on the `strapi::body` middleware
 * - `sizeLimit`: `upload.config.sizeLimit`
 * - `external`: a 413 without a Strapi error envelope, so something in front of Strapi
 *
 * `limit` is in bytes. Plain data so it can sit in the upload progress store.
 */
export type UploadTooLargeError =
  | { reason: 'requestLimit'; limit: number }
  | { reason: 'sizeLimit'; limit: number }
  | { reason: 'external' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * `baseQuery` reports a response without a Strapi envelope as an `UnknownError`; Strapi's own
 * 413s are named after their error class.
 */
const hasErrorEnvelope = (error: Record<string, unknown>) =>
  error instanceof UploadFileError ? error.hasErrorEnvelope : error.name !== 'UnknownError';

/**
 * Reads a too-large rejection out of an upload error: an `UploadFileError` from the XHR
 * upload, an RTK Query error, or an SSE `file:error` payload.
 */
export const getUploadTooLargeError = (error: unknown): UploadTooLargeError | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  const { details } = error;

  if (isRecord(details) && typeof details.limit === 'number') {
    if (details.code === 'FileTooBig') {
      return { reason: 'requestLimit', limit: details.limit };
    }

    if (details.code === 'SizeLimitExceeded') {
      return { reason: 'sizeLimit', limit: details.limit };
    }
  }

  if (error.status === 413 && !hasErrorEnvelope(error)) {
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
