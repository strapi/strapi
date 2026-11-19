import type { Core } from '@strapi/types';

/**
 * Members of plugin services the admin calls. `@strapi/email` and `@strapi/upload` depend on
 * `@strapi/admin`, so the admin build cannot load their registered contracts: lookups pass these
 * shapes as explicit generics instead.
 */

/** `plugin::email.email`, see `@strapi/email` `server/src/services/email.ts`. */
export type EmailService = {
  sendTemplatedEmail(
    emailOptions: Record<string, unknown>,
    emailTemplate: unknown,
    data: Record<string, unknown>
    // `any` as on develop without strict types: `auth.forgotPassword` returns this result in its
    // published type. `@strapi/email` types its sends `Promise<unknown>`.
  ): Promise<Core.IsStrict extends true ? unknown : any>;
};

/**
 * `plugin::upload.upload`, see `@strapi/upload` `server/src/services/upload.ts`.
 * `filename` takes formidable's nullable `originalFilename`, as upload does: a missing name is
 * rejected at runtime.
 */
export type UploadService<TFileInfo> = {
  formatFileInfo(file: {
    filename: string | null;
    type: string | null;
    size: number;
  }): Promise<TFileInfo>;
};

/** `plugin::upload.image-manipulation`, see `@strapi/upload` `server/src/services/image-manipulation.ts`. */
export type ImageManipulationService = {
  getDimensions(file: {
    getStream: () => NodeJS.ReadableStream;
  }): Promise<{ width: number | null; height: number | null }>;
};

/**
 * Members of `strapi.plugin('upload').provider` the admin calls, see `@strapi/upload`
 * `server/src/types/provider.ts` (`UploadPluginProvider`). Upload's `register` sets the provider:
 * it implements `delete` and at least one of `upload` and `uploadStream`, and `isPrivate` defaults
 * to the base version. Upload registers the provider's type, which the admin build cannot load, so
 * `provider` is `unknown` there with strict types: `hasUploadProviderMethod` narrows it.
 */
export type UploadProvider = {
  /** Sets the file's `url`. The file carries a `buffer`. */
  upload(file: unknown): Promise<unknown>;
  /** Sets the file's `url`. The file carries a `stream`. Used over `upload`. */
  uploadStream(file: unknown): Promise<unknown>;
  delete(file: unknown): Promise<unknown>;
  isPrivate(): boolean | Promise<boolean>;
};
