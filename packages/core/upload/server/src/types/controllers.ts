import type { Core } from '@strapi/types';

/** Admin actions listing, reading and deleting files, and admin actions on AI metadata. */
export type AdminFileController = {
  find: Core.ControllerHandler;
  findOne: Core.ControllerHandler;
  destroy: Core.ControllerHandler;
  getAIMetadataPendingCount: Core.ControllerHandler;
  createAIMetadataJob: Core.ControllerHandler;
  generateAIMetadata: Core.ControllerHandler;
  getLatestAIMetadataJob: Core.ControllerHandler;
};

/** Admin actions uploading and replacing files, and updating their information. */
export type AdminUploadController = {
  bulkUpdateFileInfo: Core.ControllerHandler;
  updateFileInfo: Core.ControllerHandler;
  replaceFile: Core.ControllerHandler;
  /**
   * Not routed: `upload` delegates to it when the request has files and no file ID.
   * @internal
   */
  uploadFiles: Core.ControllerHandler;
  uploadFile: Core.ControllerHandler;
  uploadFromUrls: Core.ControllerHandler;
  upload: Core.ControllerHandler;
};

/** The controller contracts by name, as in the plugin's controllers map. Used to check the routes. */
export type Controllers = {
  'admin-file': AdminFileController;
  'admin-upload': AdminUploadController;
};

/** Default controller contracts loaded with the Upload server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageControllers {
        'plugin::upload.admin-file': Controllers['admin-file'];
        'plugin::upload.admin-upload': Controllers['admin-upload'];
      }
    }
  }
}
