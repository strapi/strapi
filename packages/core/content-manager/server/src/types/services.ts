import type { Ability } from '@casl/ability';
import type { Data, Modules, Schema, Struct, UID, Utils } from '@strapi/types';
import type { ComponentConfiguration } from '../../../shared/contracts/components';
import type { Configuration } from '../../../shared/contracts/content-types';
import type {
  HistoryVersionDataResponse,
  Pagination,
} from '../../../shared/contracts/history-versions';
import type { DocumentManagerService as DocumentManagerFactory } from '../services/document-manager';
import type createDocumentMetadata from '../services/document-metadata';
import type { DocumentVersion, GetMetadataOptions } from '../services/document-metadata';
import type createComponentsService from '../services/components';
import type createContentTypesService from '../services/content-types';
import type { ConfigurationUpdate } from '../services/configuration';
import type createDataMapperService from '../services/data-mapper';
import type { createHomepageService } from '../homepage/services/homepage';
import type { createHistoryService } from '../history/services/history';
import type { createLifecyclesService } from '../history/services/lifecycles';
import type { createPreviewConfigService } from '../preview/services/preview-config';

type DocumentManagerImplementation = ReturnType<DocumentManagerFactory>;
type FindLocalesOptions = Parameters<DocumentManagerImplementation['findLocales']>[2];
type FindPageOptions = NonNullable<Parameters<DocumentManagerImplementation['findPage']>[0]>;

// TODO @Nico type results and write data by content type UID, with `createdBy`/`updatedBy` as
// minimal creator references; the methods take `UID.CollectionType`, not a generic UID.
/**
 * Existing document operations, including nullable lookups and optional clone results.
 * `findLocales` takes the populate value itself; the implementation keeps its published develop
 * option type, which wraps it in `{ populate }`.
 *
 * Documents and write data are the document service types for any content type: without schema
 * registries, `AnyDocument` and its input counterpart.
 */
export type DocumentManagerService = Omit<
  DocumentManagerImplementation,
  'findLocales' | 'findPage' | 'countDraftRelations'
> & {
  /**
   * The versions as database rows: no `status`, and relations only as populated.
   * @internal
   */
  findLocales(
    id: Parameters<DocumentManagerImplementation['findLocales']>[0],
    uid: Parameters<DocumentManagerImplementation['findLocales']>[1],
    opts: Omit<FindLocalesOptions, 'populate'> & {
      populate?: Modules.Documents.Params.Pick<UID.ContentType, 'populate'>['populate'];
    }
  ): Promise<Modules.Documents.AnyDocument[]>;
  /**
   * Finds one page of documents. The admin list view passes its query string as is, so
   * `page`, `pageSize` and `hasPublishedVersion` may arrive as strings; the pagination and the
   * document service parse them.
   * @internal
   */
  findPage(
    opts:
      | (Omit<FindPageOptions, 'page' | 'pageSize' | 'start' | 'limit' | 'hasPublishedVersion'> &
          Utils.XOR<
            { page?: number | string; pageSize?: number | string },
            Modules.Documents.Params.Pagination.OffsetNotation
          > & { hasPublishedVersion?: boolean | 'true' | 'false' })
      | undefined,
    uid: Parameters<DocumentManagerImplementation['findPage']>[1]
  ): ReturnType<DocumentManagerImplementation['findPage']>;
  /**
   * Counts the draft relations of a document version. Without a locale (a non-localized content
   * type), the document service reads the default locale.
   * @internal
   */
  countDraftRelations(
    id: Parameters<DocumentManagerImplementation['countDraftRelations']>[0],
    uid: Parameters<DocumentManagerImplementation['countDraftRelations']>[1],
    locale?: string
  ): ReturnType<DocumentManagerImplementation['countDraftRelations']>;
};

type DocumentMetadataImplementation = ReturnType<typeof createDocumentMetadata>;

/** A document version as the metadata service reads it: `locale` may be `null`. */
export type MetadataDocumentVersion = Omit<DocumentVersion, 'locale' | 'localizations'> & {
  locale?: string | null;
  localizations?: MetadataDocumentVersion[];
};

/** A version row as the metadata service reads it from the database: dates are ISO strings. */
export type MetadataVersionRow = {
  id: Data.ID;
  documentId: string;
  locale: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

/**
 * Another locale of a document. With draft and publish, it is the draft version with its status.
 * Items also hold other fields of the version, such as its non-localized fields.
 */
export type AvailableLocale = MetadataVersionRow & {
  status?: 'published' | 'draft' | 'modified';
  [key: string]: unknown;
};

/**
 * Metadata operations shared by collection, single type and relation controllers. Versions may be
 * partial, `locale` may be `null`, and statuses are the Content Manager ones. The implementation
 * keeps its published develop types.
 */
export type DocumentMetadataService = Omit<
  DocumentMetadataImplementation,
  | 'getAvailableLocales'
  | 'getAvailableStatus'
  | 'getManyAvailableStatus'
  | 'getStatus'
  | 'getMetadata'
  | 'formatDocumentWithMetadata'
> & {
  /** @internal */
  getAvailableLocales(
    uid: UID.ContentType,
    version: Partial<MetadataDocumentVersion>,
    allVersions: MetadataDocumentVersion[]
  ): Promise<AvailableLocale[]>;
  /** @internal */
  getAvailableStatus(
    version: Partial<MetadataDocumentVersion>,
    allVersions: MetadataDocumentVersion[]
  ): Partial<MetadataDocumentVersion> | undefined;
  /**
   * Versions of the given documents in the other publication status, read from the status of the
   * first document.
   * @internal
   */
  getManyAvailableStatus(
    uid: UID.ContentType,
    documents: MetadataDocumentVersion[]
  ): Promise<MetadataVersionRow[]>;
  getStatus(
    version: Partial<MetadataDocumentVersion>,
    otherDocumentStatuses?: Partial<MetadataDocumentVersion>[]
  ): 'published' | 'draft' | 'modified';
  getMetadata(
    uid: UID.ContentType,
    version: Pick<MetadataDocumentVersion, 'documentId'> & Partial<MetadataDocumentVersion>,
    options?: GetMetadataOptions
  ): Promise<{
    availableLocales: AvailableLocale[];
    availableStatus: Partial<MetadataDocumentVersion>[];
    versions: MetadataDocumentVersion[];
  }>;
  /**
   * The document with its status, which is `undefined` without draft and publish, and its metadata.
   * @internal
   */
  formatDocumentWithMetadata<TDocument extends MetadataDocumentVersion>(
    uid: UID.ContentType,
    document: TDocument,
    opts?: GetMetadataOptions
  ): Promise<{
    data: TDocument & { status: 'published' | 'draft' | 'modified' | undefined };
    meta: {
      availableLocales: AvailableLocale[];
      availableStatus: Partial<MetadataDocumentVersion>[];
    };
  }>;
};

/** Content types visible in the Content Manager folder navigation. */
export type ContentStructureService = {
  /** @internal */
  getContentStructure(): Promise<Modules.ContentStructure.ResolvedContentStructure | null>;
};

type FieldSize = NonNullable<Modules.CustomFields.CustomFieldServerOptions['inputSize']>;

/** Sizes of built-in and registered custom fields in the edit view. */
export type FieldSizesService = {
  /** @internal */
  getAllFieldSizes(): Record<string, FieldSize>;
  /**
   * Layout syncs pass the attribute's custom field name, which is `undefined` for built-in fields.
   * @internal
   */
  hasFieldSize(type: string | undefined): boolean;
  /** @internal */
  getFieldSize(type?: string): FieldSize;
  /** @internal */
  setFieldSize(type: string, size: FieldSize): void;
  /** @internal */
  setCustomFieldInputSizes(): void;
};

/** Telemetry sent when the Content Manager list view is configured. */
export type MetricsService = {
  /** @internal */
  sendDidConfigureListView(
    contentType: Struct.ContentTypeSchema,
    configuration: Configuration
  ): Promise<void>;
};

type UIDField = {
  contentTypeUID: UID.ContentType;
  field: string;
  locale?: string;
};

/** Generate and check UID values within the selected content type and locale. */
export type UIDService = {
  /** @internal */
  generateUIDField(options: UIDField & { data: Record<string, unknown> }): Promise<string>;
  /** @internal */
  findUniqueUID(options: UIDField & { value: string }): Promise<string>;
  /** @internal */
  checkUIDAvailability(options: UIDField & { value: string }): Promise<boolean>;
};

export type Populate = Record<string, boolean | object>;

/** A mutable builder. Without query or deep population, build resolves to undefined. */
export type PopulateBuilder = {
  populateFromQuery(query: object): PopulateBuilder;
  countRelations(options?: { toMany?: boolean; toOne?: boolean }): PopulateBuilder;
  populateDeep(level?: number): PopulateBuilder;
  withPopulateOverride(overrides: Populate): PopulateBuilder;
  build(): Promise<Populate | undefined>;
};

/** Callable service constructing a populate builder for a content type or component. */
export type PopulateBuilderService = (uid: UID.Schema) => PopulateBuilder;

/** Actions with shortcuts attached to the checker functions at runtime, such as `can.read(entity)`. */
export type PermissionCheckerAction =
  'read' | 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'discard';

// TODO @Nico tighten contract: output and input sanitizers forward the admin permissions manager's
// `unknown` results, which callers use as non-null documents. A document type needs null handling
// at about 19 controller and MCP call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sanitized = any;

/** A request query, without the fields and populate the ability does not permit. */
type SanitizedQuery = Record<string, unknown>;

/** A permission check, with a shortcut for each Content Manager action. */
type PermissionCheck = ((action: string, entity?: unknown, field?: string) => boolean) &
  Record<PermissionCheckerAction, (entity?: unknown, field?: string) => boolean>;

/** Permission checks, sanitizers and validators bound to a user ability and a model. */
export type PermissionChecker = {
  can: PermissionCheck;
  cannot: PermissionCheck;
  /** Whether the entity is needed to evaluate the action, because a rule has conditions. */
  requiresEntity: ((action: string) => boolean) & Record<PermissionCheckerAction, () => boolean>;
  sanitizeOutput(data: unknown, options?: { action?: string }): Promise<Sanitized>;
  sanitizeQuery(query: unknown, options?: { action?: string }): Promise<SanitizedQuery>;
  sanitizeCreateInput(data: unknown): Promise<Sanitized>;
  sanitizeUpdateInput(entity: unknown): (data: unknown) => Promise<Sanitized>;
  validateQuery(query: unknown, options?: { action?: string }): Promise<unknown>;
  validateInput(action: string, data: unknown, entity?: unknown): Promise<unknown>;
  /** Sanitizes a query, then restricts it to what the ability permits. */
  sanitizedQuery: ((query: unknown, options?: { action?: string }) => Promise<SanitizedQuery>) &
    Record<PermissionCheckerAction, (query: unknown) => Promise<SanitizedQuery>>;
};

export type PermissionCheckerService = {
  create(options: { userAbility: Ability; model: string }): PermissionChecker;
};

/**
 * A model attribute as the Content Manager lists it. Relations also carry their target as
 * `targetModel` and their kind as `relationType`.
 */
export type ContentManagerAttribute = Schema.Attribute.AnyAttribute & {
  targetModel?: UID.ContentType;
  relationType?: Schema.Attribute.RelationKind.Any;
};

/**
 * A content type or component as the Content Manager models it. Its attributes are the visible
 * ones, timestamps and creator fields, plus `id` and `documentId`; morph relations are left out.
 */
export type ContentManagerModel<TModel extends Struct.ComponentSchema | Struct.ContentTypeSchema> =
  TModel & {
    apiID: string;
    isDisplayed: boolean;
    attributes: Record<string, ContentManagerAttribute>;
  };

/** A content type's edit and list view configuration, with its UID. */
export type ContentTypeConfiguration = Configuration & { uid: UID.ContentType };

/** A component's edit and list view configuration, with its UID and category. */
export type ComponentModelConfiguration = ComponentConfiguration & { uid: UID.Component };

type ComponentsImplementation = ReturnType<typeof createComponentsService>;

/**
 * Component models and their edit and list view configurations. The implementation keeps its
 * published develop types, where lookups through its untyped helper resolve to `unknown`/`any`.
 */
export type ComponentsService = Omit<
  ComponentsImplementation,
  | 'findAllComponents'
  | 'findComponent'
  | 'findComponentsConfigurations'
  | 'findConfiguration'
  | 'updateConfiguration'
> & {
  findAllComponents(): ContentManagerModel<Struct.ComponentSchema>[];
  /** @internal */
  findComponent(uid: UID.Component): ContentManagerModel<Struct.ComponentSchema> | undefined;
  /**
   * Content types and components both hold component attributes.
   *
   * @internal
   */
  findComponentsConfigurations(
    model: Struct.ComponentSchema | Struct.ContentTypeSchema
  ): ReturnType<ComponentsImplementation['findComponentsConfigurations']>;
  /** @internal */
  findConfiguration(
    component: Pick<Struct.ComponentSchema, 'uid' | 'category'>
  ): Promise<ComponentModelConfiguration>;
  /**
   * Each top-level key of the update replaces the stored one: a partial `settings` drops the
   * settings it leaves out.
   *
   * @internal
   */
  updateConfiguration(
    component: Pick<Struct.ComponentSchema, 'uid' | 'category'>,
    newConfiguration: ConfigurationUpdate
  ): Promise<ComponentModelConfiguration>;
};

type ContentTypesImplementation = ReturnType<typeof createContentTypesService>;

/**
 * Content type models and their edit and list view configurations. Configurations are read and
 * written by UID alone. The implementation keeps its published develop parameter types.
 */
export type ContentTypesService = Omit<
  ContentTypesImplementation,
  | 'findAllContentTypes'
  | 'findContentType'
  | 'findDisplayedContentTypes'
  | 'findContentTypesByKind'
  | 'findConfiguration'
  | 'updateConfiguration'
> & {
  /** @internal */
  findAllContentTypes(): ContentManagerModel<Struct.ContentTypeSchema>[];
  /** @internal */
  findContentType(uid: UID.ContentType): ContentManagerModel<Struct.ContentTypeSchema> | undefined;
  /** @internal */
  findDisplayedContentTypes(): ContentManagerModel<Struct.ContentTypeSchema>[];
  /**
   * Without a kind, every content type.
   *
   * @internal
   */
  findContentTypesByKind(
    kind?: Struct.ContentTypeKind | null
  ): ContentManagerModel<Struct.ContentTypeSchema>[];
  findConfiguration(
    contentType: Pick<Struct.ContentTypeSchema, 'uid'>
  ): Promise<ContentTypeConfiguration>;
  /**
   * Each top-level key of the update replaces the stored one: a partial `settings` drops the
   * settings it leaves out, so pass complete `settings`.
   */
  updateConfiguration(
    contentType: Pick<Struct.ContentTypeSchema, 'uid'>,
    newConfiguration: Partial<ConfigurationUpdate>
  ): Promise<ContentTypeConfiguration>;
};

/**
 * Maps content type and component schemas to Content Manager models and DTOs. The implementation
 * keeps its published develop parameter type, a component schema.
 */
export type DataMapperService = Omit<
  ReturnType<typeof createDataMapperService>,
  'toContentManagerModel'
> & {
  /** @internal */
  toContentManagerModel<TModel extends Struct.ComponentSchema | Struct.ContentTypeSchema>(
    model: TModel
  ): ContentManagerModel<TModel>;
};

/** Content Manager permission registration and configuration checks. */
export type PermissionService = {
  /**
   * Whether the ability may configure the views of the content type: the single type or the
   * collection type configure-view action.
   * @internal
   */
  canConfigureContentType(options: {
    userAbility: Ability;
    contentType: Struct.ContentTypeSchema;
  }): boolean;
  /**
   * Registers the Content Manager admin actions. It throws after the bootstrap phase.
   * @internal
   */
  registerPermissions(): Promise<void>;
};

/** Homepage widgets: recent and counted documents. */
export type HomepageService = ReturnType<typeof createHomepageService>;

type HistoryServiceImplementation = ReturnType<typeof createHistoryService>;

/** A reference to the admin user who recorded a history version. */
export type CreatorReference = { id: number };

/**
 * The document values of a history version as `findVersionsPage` returns them. A relation or
 * media value becomes `{ results, meta: { missingCount } }`: the related entries the user may
 * read, and the number of entries that no longer exist.
 */
export type HistoryVersionResultData = {
  // TODO @Nico runtime bug: `findVersionsPage` removes the root `id` instead of the component `id`
  // when it visits a component attribute, so `id` is absent from versions with components.
  id?: number;
  documentId: string;
  locale: string | null;
  [attribute: string]: unknown;
};

/**
 * A history version as `findVersionsPage` returns it. `createdBy` is `null` for a version
 * recorded without an admin user, and `locale` is `null` for a content type without i18n.
 */
// TODO @Nico runtime bug: the history version model has no `componentsSchemas` attribute, so
// `createVersion` drops it and versions are read without it, unlike `HistoryVersionDataResponse`.
export type HistoryVersionResult = Omit<
  HistoryVersionDataResponse,
  'componentsSchemas' | 'createdBy' | 'data'
> & {
  createdBy: CreatorReference | null;
  data: HistoryVersionResultData;
};

// TODO @Nico runtime bug: `restoreVersion` throws a `TypeError` for an unknown version id (HTTP
// 500), and fails for a version whose component was replaced since, because it removes the root
// `id` instead of the component `id`.
/**
 * History versions. Only registered when the `cms-content-history` feature is enabled.
 * `createVersion` data and `restoreVersion` results keep the document service fallback,
 * `AnyDocument`, like the document manager.
 */
export type HistoryService = Omit<HistoryServiceImplementation, 'findVersionsPage'> & {
  /**
   * One page of the versions of a content type, newest first: of one document when `documentId`
   * is given, and of one locale (the default one without `locale`) for a localized content type.
   * @internal
   */
  findVersionsPage(
    params: Parameters<HistoryServiceImplementation['findVersionsPage']>[0]
  ): Promise<{ results: HistoryVersionResult[]; pagination: Pagination }>;
};

/** History recording lifecycles. Only registered when the `cms-content-history` feature is enabled. */
export type LifecyclesService = ReturnType<typeof createLifecyclesService>;

/**
 * The document version to preview. The controller fills `documentId` (the single type's document)
 * and `status` (draft with draft and publish, published otherwise). A localized content type gets
 * the requested `locale`; a bare `locale` query parameter arrives as `null`.
 */
type PreviewUrlParams = {
  documentId: string;
  // TODO @Nico the configured handler's `PreviewHandlerParams.locale` (`@strapi/types`) is
  // `string | undefined`, but a bare `locale` query parameter reaches it as `null`.
  locale?: string | null;
  status: 'published' | 'draft';
};

/** Preview URLs. */
export type PreviewService = {
  /**
   * The URL the configured handler returns for the document version; `null` or `undefined` when
   * it has none, `undefined` when preview is disabled. Throws a `NotFoundError` without a preview
   * configuration and an `ApplicationError` when the handler throws.
   * @internal
   */
  getPreviewUrl(uid: UID.ContentType, params: PreviewUrlParams): Promise<string | null | undefined>;
};

/** Preview configuration. */
export type PreviewConfigService = ReturnType<typeof createPreviewConfigService>;
