import type { Providers } from '@strapi/types';
import type { File, UploadableFile } from '../types';

/** The wrapped `upload` and `uploadStream`: at least one, as the provider implements them. */
type PluginUploadMethods =
  | {
      /** Sets the file's `url`. The file carries a `stream`. Used over `upload`. */
      uploadStream(file: UploadableFile, options?: unknown): Promise<unknown>;
      /** Sets the file's `url`. The file carries a `buffer`. */
      upload?(file: UploadableFile, options?: unknown): Promise<unknown>;
    }
  | {
      uploadStream?: undefined;
      /** Sets the file's `url`. The file carries a `buffer`. */
      upload(file: UploadableFile, options?: unknown): Promise<unknown>;
    };

/**
 * `strapi.plugin('upload').provider`: the configured provider as `register` sets it, not the object
 * the provider module's `init` returns ({@link Providers.Upload.Provider}). Each method of that
 * object is wrapped in an async function that forwards `(file, options)`, with `options` defaulting
 * to the method's `actionOptions`. A provider implements `delete` and at least one of `upload` and
 * `uploadStream`.
 *
 * Without their own `isPrivate`, `getSignedUrl` or `checkFileSize`, the base versions apply and
 * answer synchronously: not private, the file itself as signed, and a `PayloadTooLargeError` above
 * `sizeLimit`.
 */
export type UploadPluginProvider = PluginUploadMethods & {
  /** The old file takes the place of `options`: the wrapper forwards two arguments only. */
  replace?(newFile: UploadableFile, oldFile: File): Promise<unknown>;
  /** Used over `replace` when present. */
  replaceStream?(newFile: UploadableFile, oldFile: File): Promise<unknown>;
  /** Receives a file row or one of its stored `formats` entries, which `File` types as `unknown`. */
  delete(file: unknown, options?: unknown): Promise<unknown>;
  /** Throws when the file exceeds `sizeLimit` (in bytes); no limit without one. */
  checkFileSize(
    file: UploadableFile,
    options: Providers.Upload.CheckFileSizeOptions
  ): void | Promise<unknown>;
  getSignedUrl(file: File): { url?: string | undefined } | Promise<{ url?: string | undefined }>;
  isPrivate(): boolean | Promise<boolean>;
  /** Assigns the members of `obj` to the provider. */
  extend(obj: unknown): void;
};

/** The members {@link UploadPluginProvider} types: the provider contract and the base `extend`. */
type ContractMember = keyof Providers.Upload.Provider | 'extend';

/**
 * A provider method after wrapping: async, forwarding its first two arguments only, the second
 * defaulting to the method's `actionOptions`.
 */
type WrappedMember<T> = T extends (...args: infer TArgs) => infer TResult
  ? (...args: Partial<[TArgs[0], TArgs[1]]>) => Promise<Awaited<TResult>>
  : never;

/**
 * The members of a provider outside the contract, as the wrapper exposes them. It wraps only the
 * members that are functions, and drops the others.
 */
type WrappedMembers<TProvider> = {
  [
    TKey in keyof TProvider as TKey extends ContractMember
      ? never
      : NonNullable<TProvider[TKey]> extends (...args: never[]) => unknown
        ? TKey
        : never
  ]: WrappedMember<TProvider[TKey]>;
};

/**
 * `strapi.plugin('upload').provider` for a given provider module: {@link UploadPluginProvider},
 * plus the members of the module's provider outside the contract, as the wrapper exposes them
 * (async, two arguments). Declare it in `AppPluginProviders` to call those members. The constraint
 * checks the module against the provider contract, whatever `init` options it declares.
 *
 * @example
 * import type { UploadPluginProviderOf } from '@strapi/upload/strapi-server';
 * import type awsS3 from '@strapi/provider-upload-aws-s3';
 *
 * declare global {
 *   namespace Strapi.Registries {
 *     interface AppPluginProviders {
 *       upload: UploadPluginProviderOf<typeof awsS3>;
 *     }
 *   }
 * }
 *
 * @template TModule - The type of the provider module.
 */
export type UploadPluginProviderOf<TModule extends Providers.Upload.Factory<never>> =
  UploadPluginProvider & WrappedMembers<ReturnType<TModule['init']>>;
