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
  ): Promise<unknown>;
};

/**
 * `plugin::upload.upload`, see `@strapi/upload` `server/src/services/upload.ts`.
 * `filename` is nullable here because the admin forwards formidable's nullable `originalFilename`,
 * which upload types as `string`.
 */
export type UploadService<TFileInfo> = {
  // TODO @Nico tighten contract: upload's formatFileInfo requires a filename; the admin can pass null.
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
