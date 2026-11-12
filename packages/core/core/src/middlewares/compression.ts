import compress from 'koa-compress';
import type { BrotliOptions, ZlibOptions } from 'node:zlib';
import type { Core } from '@strapi/types';

/**
 * Options passed to `koa-compress`. Declared here so the published declarations do not need
 * `@types/koa-compress`, which applications do not install.
 */
export type Config = {
  /** Whether to compress a response, from its content type. */
  filter?: (mimeType: string) => boolean;
  /** Minimum response size to compress, in bytes or as a string such as `'1kb'`. */
  threshold?: number | string;
  /** `false` disables the encoding. */
  gzip?: ZlibOptions | false;
  deflate?: ZlibOptions | false;
  br?: BrotliOptions | false;
  defaultEncoding?: string;
};

export const compression: Core.MiddlewareFactory<Config> = (config) => compress(config);
