import type { Core } from '@strapi/strapi';
import type {
  File,
  UploadableFile,
  UploadPluginProvider,
  UploadPluginProviderOf,
} from '@strapi/upload/strapi-server';
import type awsS3 from '@strapi/provider-upload-aws-s3';
import type { File as S3File, ProviderConfig } from '@strapi/provider-upload-aws-s3';
import type cloudinary from '@strapi/provider-upload-cloudinary';
import type local from '@strapi/provider-upload-local';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const app: Core.Strapi;
declare const file: UploadableFile;
declare const fileRow: File;

// The package registers the provider as `register` wraps it.
const provider = app.plugin('upload').provider;
export type Registered = Expect<Equal<[typeof provider], [UploadPluginProvider]>>;
provider.delete(fileRow) satisfies Promise<unknown>;
provider.isPrivate() satisfies boolean | Promise<boolean>;
provider.checkFileSize(file, { sizeLimit: 1024 }) satisfies void | Promise<unknown>;
// @ts-expect-error A provider may implement only `upload`.
provider.uploadStream(file);
// @ts-expect-error A provider may implement only `uploadStream`.
provider.upload(file);
if (typeof provider.uploadStream === 'function') {
  provider.uploadStream(file) satisfies Promise<unknown>;
} else {
  provider.upload(file) satisfies Promise<unknown>;
}
// @ts-expect-error The package contract has no arbitrary members.
provider.missing();

// The bundled provider modules are accepted, with their own members as the wrapper exposes them.
declare const s3: UploadPluginProviderOf<typeof awsS3>;
declare const s3File: S3File;
// A sync member of the module answers with a promise once wrapped.
s3.getProviderConfig() satisfies Promise<ProviderConfig | undefined>;
// @ts-expect-error Wrapped members answer with a promise.
s3.getProviderConfig() satisfies ProviderConfig | undefined;
s3.objectExists(s3File) satisfies Promise<boolean>;
s3.uploadIfMatch(s3File, 'etag') satisfies Promise<void>;
// @ts-expect-error The wrapper forwards the first two arguments only.
s3.uploadIfMatch(s3File, 'etag', {});
s3.delete(fileRow) satisfies Promise<unknown>;
// @ts-expect-error The provider has no arbitrary members.
s3.missing();
declare const cloudinaryProvider: UploadPluginProviderOf<typeof cloudinary>;
cloudinaryProvider satisfies UploadPluginProvider;
declare const localProvider: UploadPluginProviderOf<typeof local>;
localProvider satisfies UploadPluginProvider;

// @ts-expect-error A module whose provider has no `delete` is rejected.
export type NoDelete = UploadPluginProviderOf<{ init(): { upload(): Promise<void> } }>;
