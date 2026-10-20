import type { Core } from '@strapi/types';
import type relations from '../controllers/relations';
import type { createHistoryVersionController } from '../history/controllers/history-version';
import type { createHomepageController } from '../homepage/controllers/homepage';
import type { createPreviewController } from '../preview/controllers/preview';

/** Actions exposed by the Content Manager collection type controller. */
export type CollectionTypesController = {
  find: Core.ControllerHandler;
  findOne: Core.ControllerHandler;
  create: Core.ControllerHandler;
  update: Core.ControllerHandler;
  clone: Core.ControllerHandler;
  autoClone: Core.ControllerHandler;
  delete: Core.ControllerHandler;
  publish: Core.ControllerHandler;
  bulkFindForValidation: Core.ControllerHandler;
  bulkPublish: Core.ControllerHandler;
  bulkUnpublish: Core.ControllerHandler;
  unpublish: Core.ControllerHandler;
  discard: Core.ControllerHandler;
  bulkDelete: Core.ControllerHandler;
  countDraftRelations: Core.ControllerHandler;
  countManyEntriesDraftRelations: Core.ControllerHandler;
};

/** Actions exposed by the Content Manager component controller. */
export type ComponentsController = {
  findComponents: Core.ControllerHandler;
  findComponentConfiguration: Core.ControllerHandler;
  updateComponentConfiguration: Core.ControllerHandler;
};

/** Actions exposed by the Content Manager content type controller. */
export type ContentTypesController = {
  findContentTypes: Core.ControllerHandler;
  findContentTypesSettings: Core.ControllerHandler;
  findContentTypeConfiguration: Core.ControllerHandler;
  updateContentTypeConfiguration: Core.ControllerHandler;
};

/** Actions exposed by the Content Manager initialization controller. */
export type InitController = {
  getInitData: Core.ControllerHandler;
};

/** Actions exposed by the Content Manager relation controller. */
export type RelationsController = {
  findAvailable: Core.ControllerHandler;
  findExisting: Core.ControllerHandler;
  extractAndValidateRequestInfo: typeof relations.extractAndValidateRequestInfo;
};

/** Actions exposed by the Content Manager single type controller. */
export type SingleTypesController = {
  find: Core.ControllerHandler;
  createOrUpdate: Core.ControllerHandler;
  delete: Core.ControllerHandler;
  publish: Core.ControllerHandler;
  unpublish: Core.ControllerHandler;
  discard: Core.ControllerHandler;
  countDraftRelations: Core.ControllerHandler;
};

/** Actions exposed by the Content Manager UID controller. */
export type UIDController = {
  generateUID: Core.ControllerHandler;
  checkUIDAvailability: Core.ControllerHandler;
};

/** History version actions. Only registered when the `cms-content-history` feature is enabled. */
export type HistoryVersionController = ReturnType<typeof createHistoryVersionController>;

/** Homepage widget actions: recent and counted documents. */
export type HomepageController = ReturnType<typeof createHomepageController>;

/** Preview URL actions. */
export type PreviewController = ReturnType<typeof createPreviewController>;

/** Registered core controllers, keyed as they appear in the plugin's runtime map. */
export type RegisteredControllers = {
  [
    TUID in keyof Strapi.Registries.PackageControllers as TUID extends `plugin::content-manager.${infer TName}`
      ? TName
      : never
  ]: Strapi.Registries.PackageControllers[TUID];
};
