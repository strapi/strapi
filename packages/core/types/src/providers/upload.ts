/**
 * The contract of an upload provider, as an application or a package writes it.
 *
 * The upload plugin `require`s the configured provider module, calls its `init` with the
 * `providerOptions` of the upload config, and checks the result: it throws without `delete`, or
 * without both `upload` and `uploadStream`. It then wraps each member of the result in an async
 * function, so `strapi.plugin('upload').provider` is not the object `init` returns.
 *
 * The members use method syntax, so their parameters are checked bivariantly: a provider can
 * declare its own, narrower file and options types, as the published providers do.
 */

/** A value or a promise of it: the upload plugin awaits what a provider method returns. */
type Awaitable<T> = T | Promise<T>;

/**
 * A file as a provider receives it: a file being uploaded, a stored file, or one of its `formats`,
 * reduced to the fields providers read and set. A provider reports an upload by setting `url`, and
 * can set `previewUrl` and `provider_metadata`.
 */
export type ProviderFile = {
  name: string;
  alternativeText?: string | null | undefined;
  caption?: string | null | undefined;
  width?: number | null | undefined;
  height?: number | null | undefined;
  formats?: Record<string, unknown> | null | undefined;
  hash: string;
  ext?: string | undefined;
  mime?: string | undefined;
  /** In kilobytes. */
  size?: number | undefined;
  sizeInBytes?: number | undefined;
  /** Missing until the provider uploads the file. */
  url?: string | undefined;
  previewUrl?: string | null | undefined;
  path?: string | null | undefined;
  provider?: string | undefined;
  provider_metadata?: Record<string, unknown> | null | undefined;
  /** Set when the plugin calls `uploadStream` or `replaceStream`. */
  stream?: NodeJS.ReadableStream | undefined;
  /** Set when the plugin calls `upload` or `replace`. */
  buffer?: Buffer | undefined;
};

/** The options the upload plugin passes to `checkFileSize`. */
export type CheckFileSizeOptions = {
  /** In bytes. No limit without one. */
  sizeLimit?: number | undefined;
};

/**
 * `upload` and `uploadStream`: a provider implements at least one. The plugin calls
 * `uploadStream` when present, and `upload` otherwise.
 *
 * `options` is the method's entry in the `actionOptions` of the upload config.
 */
type UploadMethods =
  | {
      /** Stores the file and sets its `url`. The file carries a `stream`. */
      uploadStream(file: ProviderFile, options?: unknown): Awaitable<unknown>;
      /** Stores the file and sets its `url`. The file carries a `buffer`. */
      upload?(file: ProviderFile, options?: unknown): Awaitable<unknown>;
    }
  | {
      uploadStream?: undefined;
      /** Stores the file and sets its `url`. The file carries a `buffer`. */
      upload(file: ProviderFile, options?: unknown): Awaitable<unknown>;
    };

/**
 * The object an upload provider module's `init` returns. A provider implements `delete` and at least
 * one of `upload` and `uploadStream`; the other members are optional, and members outside this
 * contract are allowed. Each method may answer synchronously or with a promise.
 *
 * `options` is the method's entry in the `actionOptions` of the upload config.
 */
export type Provider = UploadMethods & {
  /**
   * Replaces a stored file, used over `delete` then `upload`. The new file carries a `buffer`. The
   * plugin forwards two arguments only: the old file takes the place of `options`.
   */
  replace?(newFile: ProviderFile, oldFile: ProviderFile): Awaitable<unknown>;
  /** Like `replace`, used over it. The new file carries a `stream`. */
  replaceStream?(newFile: ProviderFile, oldFile: ProviderFile): Awaitable<unknown>;
  /** Deletes a stored file or one of its `formats`. */
  delete(file: ProviderFile, options?: unknown): Awaitable<unknown>;
  /** Throws when the file is too large. Without it, the plugin checks `sizeLimit` itself. */
  checkFileSize?(file: ProviderFile, options: CheckFileSizeOptions): Awaitable<unknown>;
  /** Called only when `isPrivate` answers `true`. Without it, the plugin keeps the file's `url`. */
  getSignedUrl?(file: ProviderFile, options?: unknown): Awaitable<{ url: string }>;
  /** Without it, files are public. */
  isPrivate?(): Awaitable<boolean>;
};

/**
 * An upload provider module, such as `@strapi/provider-upload-local`, as the upload plugin loads it.
 *
 * @template TOptions - The `providerOptions` of the upload config, which `init` receives as is.
 * @template TProvider - The provider `init` returns, with its members outside the contract.
 */
export type Factory<TOptions = Record<string, unknown>, TProvider extends Provider = Provider> = {
  init(options: TOptions): TProvider;
};

/**
 * Types an upload provider module where it is written, and returns it unchanged. `init`'s options
 * and the provider's members outside the contract keep their own types, and editors complete the
 * contract members in JavaScript too.
 *
 * Calling it at runtime needs `@strapi/types` as a regular dependency. Without one, check the module
 * with `satisfies Providers.Upload.Factory<Options>` instead.
 *
 * @example
 * export default defineUploadProvider({
 *   init(options: { bucket: string }) {
 *     return {
 *       async uploadStream(file) { file.url = `https://cdn.example/${file.hash}${file.ext}`; },
 *       async delete(file) {},
 *     };
 *   },
 * });
 */
export const defineUploadProvider = <
  TOptions = Record<string, unknown>,
  TProvider extends Provider = Provider,
>(
  module: Factory<TOptions, TProvider>
): Factory<TOptions, TProvider> => module;
