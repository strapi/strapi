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

/** A file the provider stored: a file row, or one of its `formats`. */
export type StoredProviderFile = ProviderFile & { url: string };

/**
 * A file `getSignedUrl` receives. Besides stored files, the upload plugin signs the URLs it finds in
 * rich text and blocks, for which it knows only these fields: `hash` and `ext` come from the URL.
 */
export type SignableProviderFile = Pick<
  StoredProviderFile,
  'url' | 'hash' | 'ext' | 'path' | 'provider'
>;

/**
 * The method's entry in the `actionOptions` of the upload config, which the plugin passes as is.
 *
 * A loose record, not `unknown`: an unannotated parameter such as `customParams = {}` takes this
 * type from the contract, and providers spread it or pass it on to their SDK.
 */
export type ActionOptions = Record<string, any>;

/** The options the upload plugin passes to `checkFileSize`. */
export type CheckFileSizeOptions = {
  /** In bytes. No limit without one. */
  sizeLimit?: number | undefined;
};

/**
 * `upload` and `uploadStream`: a provider implements at least one. The plugin calls
 * `uploadStream` when present, and `upload` otherwise.
 */
type UploadMethods =
  | {
      /** Stores the file and sets its `url`. The file carries a `stream`. */
      uploadStream(file: ProviderFile, options?: ActionOptions): Awaitable<unknown>;
      /** Stores the file and sets its `url`. The file carries a `buffer`. */
      upload?(file: ProviderFile, options?: ActionOptions): Awaitable<unknown>;
    }
  | {
      uploadStream?: undefined;
      /** Stores the file and sets its `url`. The file carries a `buffer`. */
      upload(file: ProviderFile, options?: ActionOptions): Awaitable<unknown>;
    };

/**
 * The object an upload provider module's `init` returns. A provider implements `delete` and at least
 * one of `upload` and `uploadStream`; the other members are optional, and members outside this
 * contract are allowed. Each method may answer synchronously or with a promise.
 *
 * Omit the members you do not implement: never set one to `undefined`. The upload plugin wraps every
 * own key of this object, so an `undefined` member becomes a function that throws when called.
 */
export type Provider = UploadMethods & {
  /**
   * Replaces a stored file, used over `delete` then `upload`. The new file carries a `buffer`. The
   * plugin forwards two arguments only: the old file takes the place of the action options.
   */
  replace?(newFile: ProviderFile, oldFile: StoredProviderFile): Awaitable<unknown>;
  /** Like `replace`, used over it. The new file carries a `stream`. */
  replaceStream?(newFile: ProviderFile, oldFile: StoredProviderFile): Awaitable<unknown>;
  /** Deletes a stored file or one of its `formats`. */
  delete(file: StoredProviderFile, options?: ActionOptions): Awaitable<unknown>;
  /** Throws when the file is too large. Without it, the plugin checks `sizeLimit` itself. */
  checkFileSize?(file: ProviderFile, options: CheckFileSizeOptions): Awaitable<unknown>;
  /** Called only when `isPrivate` answers `true`. Without it, the plugin keeps the file's `url`. */
  getSignedUrl?(file: SignableProviderFile, options?: ActionOptions): Awaitable<{ url: string }>;
  /** Without it, files are public. */
  isPrivate?(): Awaitable<boolean>;
};

/**
 * An upload provider module, such as `@strapi/provider-upload-local`, as the upload plugin loads it.
 * Members besides `init` are allowed, such as a `name`; the plugin reads only `init`.
 *
 * @template TOptions - The `providerOptions` of the upload config, which `init` receives as is.
 * @template TProvider - The provider `init` returns, with its members outside the contract.
 */
export type Factory<TOptions = Record<string, unknown>, TProvider extends Provider = Provider> = {
  init(options: TOptions): TProvider;
  [member: string]: unknown;
};

/**
 * Types an upload provider module where it is written, and returns it unchanged, with its own type:
 * `init`'s parameters and the members outside the contract keep theirs. Editors complete the
 * contract members in JavaScript too. Annotate `init`'s options; without an annotation they are
 * the `providerOptions` record of the upload config.
 *
 * The upload plugin `require`s the module and reads `init` from it, so the module must be the
 * CommonJS export itself: `export =` in TypeScript, `module.exports =` in JavaScript.
 * Omit the provider members you do not implement: never set one to `undefined`.
 *
 * Calling it at runtime needs `@strapi/types` as a regular dependency. Without one, check the module
 * with `satisfies Providers.Upload.Factory<Options>` instead.
 *
 * @example
 * export = defineUploadProvider({
 *   init(options: { bucket: string }) {
 *     return {
 *       async uploadStream(file) { file.url = `https://cdn.example/${file.hash}${file.ext}`; },
 *       async delete(file) {},
 *     };
 *   },
 * });
 */
export const defineUploadProvider = <TModule extends Factory>(module: TModule): TModule => module;
