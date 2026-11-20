import { file } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { config } from './config';
import type { Config } from './types';

const { bytesToHumanReadable } = file;

// formidable's own default, applied by `strapi::body` when `formidable.maxFileSize` is not configured
export const DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024;

type MiddlewareEntry =
  string | { name?: string; config?: { formidable?: { maxFileSize?: unknown } } };

const getMaxFileSize = (strapi: Core.Strapi) => {
  const middlewares = strapi.config.get<MiddlewareEntry[] | undefined>('middlewares');

  if (!Array.isArray(middlewares)) {
    return DEFAULT_MAX_FILE_SIZE;
  }

  const body = middlewares.find(
    (entry) =>
      entry === 'strapi::body' || (typeof entry === 'object' && entry?.name === 'strapi::body')
  );

  const limit = Number(typeof body === 'object' ? body.config?.formidable?.maxFileSize : undefined);

  return Number.isFinite(limit) ? limit : DEFAULT_MAX_FILE_SIZE;
};

const formatLimit = (bytes: number) => `${bytesToHumanReadable(bytes)} (${bytes} bytes)`;

/**
 * The body parser rejects a file above `formidable.maxFileSize` before the upload plugin sees it,
 * so a `sizeLimit` above it is never reached. Both defaults (1 GB and ~210 MB) have always been in
 * that state, so an app that left both untouched stays quiet.
 *
 * Only the effective values are compared: a `sizeLimit` or `maxFileSize` set explicitly to its
 * default cannot be told apart from an unset one, so that pair stays quiet too.
 */
export const warnOnSizeLimitMismatch = ({ strapi }: { strapi: Core.Strapi }) => {
  const sizeLimit = strapi.config.get<Partial<Config> | undefined>('plugin::upload')?.sizeLimit;

  if (typeof sizeLimit !== 'number') {
    return;
  }

  const maxFileSize = getMaxFileSize(strapi);

  if (sizeLimit === config.default.sizeLimit && maxFileSize === DEFAULT_MAX_FILE_SIZE) {
    return;
  }

  if (sizeLimit <= maxFileSize) {
    return;
  }

  strapi.log.warn(
    [
      `upload.config.sizeLimit is ${formatLimit(
        sizeLimit
      )} but formidable.maxFileSize on the strapi::body middleware is ${formatLimit(maxFileSize)}.`,
      `Uploads above ${bytesToHumanReadable(
        maxFileSize
      )} are rejected before they reach the upload plugin.`,
      `Raise formidable.maxFileSize on the strapi::body middleware to at least ${sizeLimit} to allow uploads up to upload.config.sizeLimit.`,
    ].join(' ')
  );
};
