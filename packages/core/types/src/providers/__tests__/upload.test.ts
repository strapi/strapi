/**
 * Type-level tests of the upload provider contract, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * Each block must compile; `@ts-expect-error` marks the providers that must keep failing.
 *
 * The bundled providers (`@strapi/provider-upload-local`, `-aws-s3`, `-cloudinary`) check their own
 * module against the contract in their sources, since `@strapi/types` cannot depend on them.
 */
import type { Readable } from 'node:stream';

import { defineUploadProvider } from '../..';
import type { Providers } from '../..';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

// An application provider: options and files are typed by the contract, extra members are kept.
export const appProvider = defineUploadProvider({
  init(options: { baseUrl: string }) {
    return {
      async uploadStream(file) {
        file.url = `${options.baseUrl}/${file.hash}${file.ext}`;
      },
      async delete(file) {
        file.hash satisfies string;
      },
      isPrivate: () => true,
      async getSignedUrl(file) {
        return { url: `${file.url}?signature` };
      },
      outboxPath(): string {
        return '/tmp/outbox';
      },
    };
  },
});

true satisfies Assert<IsEqual<Parameters<typeof appProvider.init>[0], { baseUrl: string }>>;
true satisfies Assert<
  IsEqual<ReturnType<ReturnType<typeof appProvider.init>['outboxPath']>, string>
>;

// Without an annotation, the options are the `providerOptions` record of the upload config.
export const untypedOptionsProvider = defineUploadProvider({
  init(options) {
    true satisfies Assert<IsEqual<typeof options, Record<string, unknown>>>;

    return { upload() {}, delete() {} };
  },
});

// `upload` alone, or `uploadStream` alone, is enough.
export const uploadOnlyProvider = defineUploadProvider({
  init: () => ({
    upload(file) {
      file.buffer satisfies Buffer | undefined;
    },
    delete() {},
  }),
});

export const streamOnlyProvider = defineUploadProvider({
  init: () => ({
    uploadStream(file) {
      file.stream satisfies NodeJS.ReadableStream | undefined;
    },
    delete() {},
  }),
});

// A provider written against its own, narrower file type, as the published providers are: the
// contract methods are checked bivariantly.
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
      async uploadStream(file: OwnFile): Promise<void> {
        file.url = `/uploads/${file.hash}${file.ext}`;
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

// `satisfies` checks a module without the runtime call.
export const satisfiesProvider = {
  init: () => ({ uploadStream() {}, delete() {} }),
} satisfies Providers.Upload.Factory;

defineUploadProvider({
  // @ts-expect-error a provider must implement `delete`.
  init: () => ({ upload() {} }),
});

defineUploadProvider({
  // @ts-expect-error a provider must implement `upload` or `uploadStream`.
  init: () => ({ delete() {} }),
});

defineUploadProvider({
  // @ts-expect-error `getSignedUrl` must answer a string `url`.
  init: () => ({ upload() {}, delete() {}, getSignedUrl: () => ({ url: 1 }) }),
});

defineUploadProvider({
  // @ts-expect-error `isPrivate` must answer a boolean.
  init: () => ({ upload() {}, delete() {}, isPrivate: () => 'yes' }),
});

defineUploadProvider({
  // @ts-expect-error a provider method must accept the files upload passes.
  init: () => ({ upload: (file: { id: number }) => file.id, delete() {} }),
});

export const missingDeleteModule = {
  // @ts-expect-error `satisfies` rejects the same providers.
  init: () => ({ uploadStream() {} }),
} satisfies Providers.Upload.Factory;
