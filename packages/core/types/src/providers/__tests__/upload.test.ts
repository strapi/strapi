/**
 * Type-level tests of the upload provider contract, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * Each block must compile; `@ts-expect-error` marks the providers that must keep failing.
 *
 * Modules are checked with `satisfies`, the way provider packages check theirs. The bundled
 * providers (`@strapi/provider-upload-local`, `-aws-s3`, `-cloudinary`) check their own module in
 * their sources, since `@strapi/types` cannot depend on them. The application helper,
 * `factories.createUploadProvider`, is tested in @strapi/core (src/__type-tests__/upload-provider.test.ts).
 */
import type { Readable } from 'node:stream';

import type { Providers } from '../..';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

// A provider on the object literal: options and files are typed by the contract.
export const appProvider = {
  init(options: { baseUrl: string }) {
    return {
      async uploadStream(file) {
        file.url = `${options.baseUrl}/${file.hash}${file.ext}`;
      },
      async delete(file) {
        // A stored file has a URL.
        file.url satisfies string;
      },
      isPrivate: () => true,
      async getSignedUrl(file) {
        return { url: `${file.url}?signature` };
      },
      outboxPath(): string {
        return 'outbox';
      },
    };
  },
} satisfies Providers.Upload.Factory<{ baseUrl: string }>;

// Without a type argument, the options are the `providerOptions` record of the upload config.
export const untypedOptionsProvider = {
  init(options) {
    true satisfies Assert<IsEqual<typeof options, Record<string, unknown>>>;

    return { upload() {}, delete() {} };
  },
} satisfies Providers.Upload.Factory;

// Options typed with an interface, as the bundled providers declare theirs, or with an inline type.
interface CdnOptions {
  baseUrl: string;
  token?: string;
}

export const interfaceOptionsProvider = {
  init(options: CdnOptions) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
} satisfies Providers.Upload.Factory<CdnOptions>;

export const inlineOptionsProvider = {
  init(options: { baseUrl: string }) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
} satisfies Providers.Upload.Factory<{ baseUrl: string }>;

// The module may carry members besides `init`, such as a `name`.
export const namedProvider = {
  name: 'cdn',
  auth: { token: 'secret' },
  init: () => ({ upload() {}, delete() {} }),
} satisfies Providers.Upload.Factory;

// Action options, left to inference, can be spread and passed on.
export const actionOptionsProvider = {
  init: () => ({
    upload(file, customParams = {}) {
      const params: { Key: string; ACL?: string } = { ...customParams, Key: file.hash };

      return params;
    },
    delete() {},
  }),
} satisfies Providers.Upload.Factory;

// `getSignedUrl` also signs URLs found in rich text, so it gets only the fields a URL gives.
export const signingProvider = {
  init: () => ({
    upload() {},
    delete() {},
    isPrivate: () => true,
    getSignedUrl(file) {
      return { url: `${file.url}?key=${file.hash}${file.ext ?? ''}` };
    },
  }),
} satisfies Providers.Upload.Factory;

// `upload` alone, or `uploadStream` alone, is enough.
export const uploadOnlyProvider = {
  init: () => ({
    upload(file) {
      file.buffer satisfies Buffer | undefined;
    },
    delete() {},
  }),
} satisfies Providers.Upload.Factory;

export const streamOnlyProvider = {
  init: () => ({
    uploadStream(file) {
      file.stream satisfies NodeJS.ReadableStream | undefined;
    },
    delete() {},
  }),
} satisfies Providers.Upload.Factory;

// A provider written against its own, narrower file type, as the published providers are: the
// contract methods are checked bivariantly. Checked apart from its declaration, as the bundled
// providers do, so its parameters keep their own types.
type OwnFile = {
  name: string;
  hash: string;
  ext?: string;
  mime: string;
  size: number;
  url: string;
  stream?: Readable;
  buffer?: Buffer;
};

export const ownFileTypeProvider = {
  init(options: { sizeLimit?: number } = {}) {
    return {
      checkFileSize(file: OwnFile, { sizeLimit = options.sizeLimit }: { sizeLimit?: number }) {
        if (sizeLimit !== undefined && file.size > sizeLimit) {
          throw new Error(`${file.name} is too large`);
        }
      },
      async uploadStream(file: OwnFile, customParams = {}): Promise<void> {
        file.url = `/uploads/${file.hash}${file.ext}${Object.keys(customParams).join('')}`;
      },
      replace(newFile: OwnFile, oldFile: OwnFile) {
        newFile.url = oldFile.url;
      },
      delete(file: OwnFile): Promise<string | void> {
        return Promise.resolve(file.url);
      },
    };
  },
};

ownFileTypeProvider satisfies Providers.Upload.Factory<{ sizeLimit?: number }>;

// `customParams` keeps its inferred type: the contract does not retype it.
false satisfies IsEqual<
  Parameters<ReturnType<typeof ownFileTypeProvider.init>['uploadStream']>[1],
  Providers.Upload.ActionOptions | undefined
>;

export const missingDelete = {
  // @ts-expect-error a provider must implement `delete`.
  init: () => ({ upload() {} }),
} satisfies Providers.Upload.Factory;

export const missingUpload = {
  // @ts-expect-error a provider must implement `upload` or `uploadStream`.
  init: () => ({ delete() {} }),
} satisfies Providers.Upload.Factory;

export const numericSignedUrl = {
  // @ts-expect-error `getSignedUrl` must answer a string `url`.
  init: () => ({ upload() {}, delete() {}, getSignedUrl: () => ({ url: 1 }) }),
} satisfies Providers.Upload.Factory;

export const stringIsPrivate = {
  // @ts-expect-error `isPrivate` must answer a boolean.
  init: () => ({ upload() {}, delete() {}, isPrivate: () => 'yes' }),
} satisfies Providers.Upload.Factory;

export const unrelatedFile = {
  // @ts-expect-error a provider method must accept the files upload passes.
  init: () => ({ upload: (file: { id: number }) => file.id, delete() {} }),
} satisfies Providers.Upload.Factory;

export const namedSigner = {
  init: () => ({
    upload() {},
    delete() {},
    getSignedUrl(file) {
      // @ts-expect-error a URL found in rich text has no file `name`.
      return { url: file.name };
    },
  }),
} satisfies Providers.Upload.Factory;

export const interfaceWithoutTypeArgument = {
  // @ts-expect-error without a type argument, `init` must accept the `providerOptions` record.
  init(options: CdnOptions) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
} satisfies Providers.Upload.Factory;
