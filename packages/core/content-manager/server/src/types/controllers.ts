import type { Context } from 'koa';
import type { Core, Data, Schema, Struct } from '@strapi/types';
import type { createHistoryVersionController } from '../history/controllers/history-version';

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
  /**
   * Reads and checks the route params and query shared by `findAvailable` and `findExisting`.
   * Resolves `undefined` once it has set a 403 response.
   * @internal
   */
  extractAndValidateRequestInfo(
    ctx: Context,
    id?: Data.ID
  ): Promise<RelationRequestInfo | undefined>;
};

/** The relational field of a relation route request, with its source and target models. */
type RelationRequestInfo = {
  /** The source entry id, when the request names a source document or component. */
  entryId: Data.ID | null;
  /** The `locale` query parameter; a bare `?locale` reads as `null`. */
  locale: string | null | undefined;
  /** `undefined` for a source content type without draft and publish. */
  status: 'published' | 'draft' | undefined;
  attribute: Schema.Attribute.Relation;
  fieldsToSelect: string[];
  mainField: string;
  source: { schema: Struct.ContentTypeSchema | Struct.ComponentSchema; isLocalized: boolean };
  target: { schema: Struct.ContentTypeSchema; isLocalized: boolean };
  sourceSchema: Struct.ContentTypeSchema | Struct.ComponentSchema;
  targetSchema: Struct.ContentTypeSchema;
  targetField: string;
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
export type HomepageController = {
  getRecentDocuments: Core.ControllerHandler;
  getCountDocuments: Core.ControllerHandler;
};

/** Preview actions: the preview URL of a document and the standalone preview script. */
export type PreviewController = {
  getPreviewUrl: Core.ControllerHandler;
  getPreviewScript: Core.ControllerHandler;
};

/** Registered core controllers, keyed as they appear in the plugin's runtime map. */
export type RegisteredControllers = {
  [
    TUID in keyof Strapi.Registries.PackageControllers as TUID extends `plugin::content-manager.${infer TName}`
      ? TName
      : never
  ]: Strapi.Registries.PackageControllers[TUID];
};
