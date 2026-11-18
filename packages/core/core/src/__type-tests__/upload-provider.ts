/**
 * Type-level regression tests for `factories.createUploadProvider`, compiled by `yarn test:ts`
 * (tsc -p tsconfig.json) and excluded from the build. Each block must compile; `@ts-expect-error`
 * marks the providers that must keep failing.
 *
 * The contract itself, checked with `satisfies`, is tested in @strapi/types
 * (src/providers/__tests__/upload.test.ts).
 */
import type { Providers } from '@strapi/types';

import { createUploadProvider } from '../factories';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

// An application provider: options and files are typed by the contract, extra members are kept.
export const appProvider = createUploadProvider({
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
export const untypedOptionsProvider = createUploadProvider({
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

export const interfaceOptionsProvider = createUploadProvider(interfaceOptionsModule);

true satisfies Assert<IsEqual<Parameters<typeof interfaceOptionsProvider.init>[0], CdnOptions>>;

export const interfaceOptionsLiteralProvider = createUploadProvider({
  init(options: CdnOptions) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
});

// A module checked with `satisfies` can also go through the helper.
export const inlineOptionsModule = {
  init(options: { baseUrl: string }) {
    return { upload() {}, delete() {}, baseUrl: () => options.baseUrl };
  },
} satisfies Providers.Upload.Factory<{ baseUrl: string }>;

createUploadProvider(inlineOptionsModule).init({ baseUrl: '/' }).baseUrl() satisfies string;

// `init` keeps its own signature: a defaulted options parameter can still be omitted.
export const defaultedOptionsProvider = createUploadProvider({
  init(options: { sizeLimit?: number } = {}) {
    return { uploadStream() {}, delete() {}, sizeLimit: () => options.sizeLimit };
  },
});

defaultedOptionsProvider.init();

// An explicit type argument is the module type, and keeps its members outside the contract.
type BucketModule = {
  init(options: { bucket: string }): Providers.Upload.Provider & { bucketName(): string };
};

export const explicitModuleProvider = createUploadProvider<BucketModule>({
  init: (options) => ({ upload() {}, delete() {}, bucketName: () => options.bucket }),
});

explicitModuleProvider.init({ bucket: 'media' }).bucketName() satisfies string;

// The module may carry members besides `init`, such as a `name`.
export const namedProvider = createUploadProvider({
  name: 'cdn',
  auth: { token: 'secret' },
  init: () => ({ upload() {}, delete() {} }),
});

namedProvider.name satisfies string;

// Action options, left to inference, can be spread and passed on.
export const actionOptionsProvider = createUploadProvider({
  init: () => ({
    upload(file, customParams = {}) {
      const params: { Key: string; ACL?: string } = { ...customParams, Key: file.hash };

      return params;
    },
    delete() {},
  }),
});

// `getSignedUrl` also signs URLs found in rich text, so it gets only the fields a URL gives.
export const signingProvider = createUploadProvider({
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
export const uploadOnlyProvider = createUploadProvider({
  init: () => ({
    upload(file) {
      file.buffer satisfies Buffer | undefined;
    },
    delete() {},
  }),
});

export const streamOnlyProvider = createUploadProvider({
  init: () => ({
    uploadStream(file) {
      file.stream satisfies NodeJS.ReadableStream | undefined;
    },
    delete() {},
  }),
});

createUploadProvider({
  // @ts-expect-error a provider must implement `delete`.
  init: () => ({ upload() {} }),
});

createUploadProvider({
  // @ts-expect-error a provider must implement `upload` or `uploadStream`.
  init: () => ({ delete() {} }),
});

createUploadProvider({
  // @ts-expect-error `getSignedUrl` must answer a string `url`.
  init: () => ({ upload() {}, delete() {}, getSignedUrl: () => ({ url: 1 }) }),
});

createUploadProvider({
  // @ts-expect-error `isPrivate` must answer a boolean.
  init: () => ({ upload() {}, delete() {}, isPrivate: () => 'yes' }),
});

createUploadProvider({
  // @ts-expect-error a provider method must accept the files upload passes.
  init: () => ({ upload: (file: { id: number }) => file.id, delete() {} }),
});

createUploadProvider({
  init: () => ({
    upload() {},
    delete() {},
    getSignedUrl(file) {
      // @ts-expect-error a URL found in rich text has no file `name`.
      return { url: file.name };
    },
  }),
});

createUploadProvider({
  // @ts-expect-error `init` receives the `providerOptions` record, not a primitive.
  init: (options: number) => ({ upload: () => options, delete() {} }),
});
