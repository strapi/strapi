import type { Core } from '@strapi/strapi';
import type { UploadPluginProviderOf } from '@strapi/upload/strapi-server';
import type awsS3 from '@strapi/provider-upload-aws-s3';
import type { File as S3File } from '@strapi/provider-upload-aws-s3';

declare const app: Core.Strapi;

// Loading the Upload contracts does not opt applications into strictness: the provider stays
// permissive.
app.plugin('upload').provider.anything().goes();

// The helper checks the module with strict types off too.
declare const s3: UploadPluginProviderOf<typeof awsS3>;
declare const s3File: S3File;
s3.objectExists(s3File) satisfies Promise<boolean>;
// @ts-expect-error A module whose provider has no `delete` is rejected.
export type NoDelete = UploadPluginProviderOf<{ init(): { upload(): Promise<void> } }>;
