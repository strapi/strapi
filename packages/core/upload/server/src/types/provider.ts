import type { File, UploadableFile } from '../types';

/**
 * `strapi.plugin('upload').provider`: the configured provider as `register` sets it. Each method of
 * the provider module's instance is wrapped in an async function that forwards `(file, options)`,
 * with `options` defaulting to the method's `actionOptions`. A provider implements `delete` and at
 * least one of `upload` and `uploadStream`.
 *
 * Without their own `isPrivate`, `getSignedUrl` or `checkFileSize`, the base versions apply and
 * answer synchronously: not private, the file itself as signed, and a `PayloadTooLargeError` above
 * `sizeLimit`.
 */
export type UploadPluginProvider = {
  /** Sets the file's `url`. */
  upload?(file: UploadableFile, options?: unknown): Promise<unknown>;
  /** Sets the file's `url`. Used over `upload` when present. */
  uploadStream?(file: UploadableFile, options?: unknown): Promise<unknown>;
  /** The old file takes the place of `options`: the wrapper forwards two arguments only. */
  replace?(newFile: UploadableFile, oldFile: File): Promise<unknown>;
  /** Used over `replace` when present. */
  replaceStream?(newFile: UploadableFile, oldFile: File): Promise<unknown>;
  /** Receives a file row or one of its stored `formats` entries, which `File` types as `unknown`. */
  delete(file: unknown, options?: unknown): Promise<unknown>;
  /** Throws when the file exceeds `sizeLimit` (in bytes); no limit without one. */
  checkFileSize(
    file: UploadableFile,
    options: { sizeLimit?: number | undefined }
  ): void | Promise<unknown>;
  getSignedUrl(file: File): { url?: string | undefined } | Promise<{ url?: string | undefined }>;
  isPrivate(): boolean | Promise<boolean>;
  /** Assigns the members of `obj` to the provider. */
  extend(obj: unknown): void;
};
