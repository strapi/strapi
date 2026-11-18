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
        // A stored file has a URL.
        file.url satisfies string;
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

// Options typed with an interface, as the bundled providers declare theirs, or with an inline type.
interface CdnOptions {
  baseUrl: string;
  token?: string;
}

const interfaceOptionsModule = {
  init(options: CdnOptions) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
};

export const interfaceOptionsProvider = defineUploadProvider(interfaceOptionsModule);

true satisfies Assert<IsEqual<Parameters<typeof interfaceOptionsProvider.init>[0], CdnOptions>>;

interfaceOptionsModule satisfies Providers.Upload.Factory<CdnOptions>;

export const interfaceOptionsLiteralProvider = defineUploadProvider({
  init(options: CdnOptions) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
});

export const inlineOptionsModule = {
  init(options: { baseUrl: string }) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
} satisfies Providers.Upload.Factory<{ baseUrl: string }>;

defineUploadProvider(inlineOptionsModule).init({ baseUrl: '/' }).baseUrl() satisfies string;

// `init` keeps its own signature: a defaulted options parameter can still be omitted.
export const defaultedOptionsProvider = defineUploadProvider({
  init(options: { sizeLimit?: number } = {}) {
    return { uploadStream() {}, delete() {}, sizeLimit: () => options.sizeLimit };
  },
});

defaultedOptionsProvider.init();

// An explicit type argument is the module type, and keeps its members outside the contract.
type BucketModule = {
  init(options: { bucket: string }): Providers.Upload.Provider & { bucketName(): string };
};

export const explicitModuleProvider = defineUploadProvider<BucketModule>({
  init: (options) => ({ upload() {}, delete() {}, bucketName: () => options.bucket }),
});

explicitModuleProvider.init({ bucket: 'media' }).bucketName() satisfies string;

// The module may carry members besides `init`, such as a `name`.
export const namedProvider = defineUploadProvider({
  name: 'cdn',
  auth: { token: 'secret' },
  init: () => ({ upload() {}, delete() {} }),
});

namedProvider.name satisfies string;

// Action options, left to inference, can be spread and passed on.
export const actionOptionsProvider = defineUploadProvider({
  init: () => ({
    upload(file, customParams = {}) {
      const params: { Key: string; ACL?: string } = { ...customParams, Key: file.hash };

      return params;
    },
    delete() {},
  }),
});

// `getSignedUrl` also signs URLs found in rich text, so it gets only the fields a URL gives.
export const signingProvider = defineUploadProvider({
  init: () => ({
    upload() {},
    delete() {},
    isPrivate: () => true,
    getSignedUrl(file) {
      return { url: `${file.url}?key=${file.hash}${file.ext ?? ''}` };
    },
  }),
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

defineUploadProvider({
  init: () => ({
    upload() {},
    delete() {},
    getSignedUrl(file) {
      // @ts-expect-error a URL found in rich text has no file `name`.
      return { url: file.name };
    },
  }),
});

defineUploadProvider({
  // @ts-expect-error `init` receives the `providerOptions` record, not a primitive.
  init: (options: number) => ({ upload: () => options, delete() {} }),
});

export const missingDeleteModule = {
  // @ts-expect-error `satisfies` rejects the same providers.
  init: () => ({ uploadStream() {} }),
} satisfies Providers.Upload.Factory;
