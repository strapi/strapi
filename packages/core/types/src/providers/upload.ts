import type { Buffer } from 'node:buffer';
import type { Readable } from 'node:stream';

/**
 * The module an upload provider package exports.
 *
 * `init` is declared as a property, not a method, so its parameters are checked
 * strictly: a provider cannot require more from `options` than the upload
 * plugin passes.
 */
export interface Factory<Options = object> {
  init: (options: Options) => Provider;
}

/**
 * The `actionOptions[<method>]` value of the `plugin::upload` config.
 * The upload plugin passes it as the last argument of each provider method.
 */
export type ActionOptions = Record<string, unknown>;

/**
 * A provider must implement `delete` and at least one of `upload` and
 * `uploadStream`. The upload plugin checks this at runtime.
 */
export interface Provider {
  upload?: (file: PendingFile, options?: ActionOptions) => Promise<unknown>;
  uploadStream?: (file: PendingFile, options?: ActionOptions) => Promise<unknown>;
  replace?: (
    newFile: PendingFile,
    oldFile: Readonly<UploadedFile>,
    options?: ActionOptions
  ) => Promise<unknown>;
  replaceStream?: (
    newFile: PendingFile,
    oldFile: Readonly<UploadedFile>,
    options?: ActionOptions
  ) => Promise<unknown>;
  delete: (file: Readonly<UploadedFile>, options?: ActionOptions) => Promise<unknown>;
  checkFileSize?: (file: Readonly<PendingFile>, options: CheckFileSizeOptions) => void;
  getSignedUrl?: (
    file: Readonly<SignableFile>,
    options?: ActionOptions
  ) => { url: string } | Promise<{ url: string }>;
  isPrivate?: () => boolean | Promise<boolean>;
}

export interface CheckFileSizeOptions {
  sizeLimit?: number;
}

/**
 * A file the upload plugin hands to a provider to store. It has no `url` yet.
 * Providers report the result by setting `url`, and can set `previewUrl` and
 * `provider_metadata`. The other fields are inputs and are read-only.
 */
export interface PendingFile {
  readonly name: string;
  readonly alternativeText?: string | null;
  readonly caption?: string | null;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly formats?: Record<string, unknown> | null;
  readonly hash: string;
  readonly ext?: string;
  readonly mime: string;
  /**
   * Size in kilobytes.
   */
  readonly size: number;
  readonly sizeInBytes?: number;
  readonly path?: string | null;
  /**
   * Set when the plugin calls `uploadStream` or `replaceStream`.
   */
  readonly stream?: Readable;
  /**
   * Set when the plugin calls `upload` or `replace`.
   */
  readonly buffer?: Buffer;

  url?: string;
  previewUrl?: string | null;
  provider_metadata?: Record<string, unknown> | null;
}

/**
 * A file a provider has stored: a saved file or one of its `formats` entries.
 * Its content is in the storage, so it has no `stream` or `buffer`.
 */
export interface UploadedFile extends Omit<PendingFile, 'url' | 'stream' | 'buffer'> {
  url: string;
}

/**
 * What `getSignedUrl` can rely on. Besides stored files, the upload plugin signs
 * URLs found in rich text, for which it only knows the URL, hash and extension.
 */
export type SignableFile = Pick<UploadedFile, 'url' | 'hash' | 'ext' | 'path'>;
