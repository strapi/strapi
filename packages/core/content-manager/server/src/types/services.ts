import type { Ability } from '@casl/ability';
import type { Modules, Struct, UID } from '@strapi/types';
import type { Configuration } from '../../../shared/contracts/content-types';
import type { DocumentManagerService as DocumentManagerFactory } from '../services/document-manager';
import type createDocumentMetadata from '../services/document-metadata';
import type { DocumentVersion, GetMetadataOptions } from '../services/document-metadata';
import type createComponentsService from '../services/components';
import type createContentTypesService from '../services/content-types';
import type { ConfigurationUpdate } from '../services/configuration';
import type createDataMapperService from '../services/data-mapper';
import type createPermissionService from '../services/permission';
import type { createHomepageService } from '../homepage/services/homepage';
import type { createHistoryService } from '../history/services/history';
import type { createLifecyclesService } from '../history/services/lifecycles';
import type { createPreviewService } from '../preview/services/preview';
import type { createPreviewConfigService } from '../preview/services/preview-config';

type DocumentManagerImplementation = ReturnType<DocumentManagerFactory>;
type FindLocalesOptions = Parameters<DocumentManagerImplementation['findLocales']>[2];

/**
 * Existing document operations, including nullable lookups and optional clone results.
 * `findLocales` takes the populate value itself; the implementation keeps its published develop
 * option type, which wraps it in `{ populate }`.
 */
export type DocumentManagerService = Omit<DocumentManagerImplementation, 'findLocales'> & {
  findLocales(
    id: Parameters<DocumentManagerImplementation['findLocales']>[0],
    uid: Parameters<DocumentManagerImplementation['findLocales']>[1],
    opts: Omit<FindLocalesOptions, 'populate'> & {
      populate?: Modules.Documents.Params.Pick<UID.ContentType, 'populate'>['populate'];
    }
  ): ReturnType<DocumentManagerImplementation['findLocales']>;
};

type DocumentMetadataImplementation = ReturnType<typeof createDocumentMetadata>;

/** A document version as the metadata service reads it: `locale` may be `null`. */
export type MetadataDocumentVersion = Omit<DocumentVersion, 'locale' | 'localizations'> & {
  locale?: string | null;
  localizations?: MetadataDocumentVersion[];
};

/**
 * Metadata operations shared by collection, single type and relation controllers. Versions may be
 * partial, `locale` may be `null`, and statuses are the Content Manager ones. The implementation
 * keeps its published develop types.
 */
export type DocumentMetadataService = Omit<
  DocumentMetadataImplementation,
  'getAvailableLocales' | 'getAvailableStatus' | 'getStatus' | 'getMetadata'
> & {
  getAvailableLocales(
    uid: UID.ContentType,
    version: Partial<MetadataDocumentVersion>,
    allVersions: MetadataDocumentVersion[]
  ): ReturnType<DocumentMetadataImplementation['getAvailableLocales']>;
  getAvailableStatus(
    version: Partial<MetadataDocumentVersion>,
    allVersions: MetadataDocumentVersion[]
  ): Partial<MetadataDocumentVersion> | undefined;
  getStatus(
    version: Partial<MetadataDocumentVersion>,
    otherDocumentStatuses?: Partial<MetadataDocumentVersion>[]
  ): 'published' | 'draft' | 'modified';
  getMetadata(
    uid: UID.ContentType,
    version: Pick<MetadataDocumentVersion, 'documentId'> & Partial<MetadataDocumentVersion>,
    options?: GetMetadataOptions
  ): Promise<{
    availableLocales: Awaited<ReturnType<DocumentMetadataImplementation['getAvailableLocales']>>;
    availableStatus: Partial<MetadataDocumentVersion>[];
    versions: MetadataDocumentVersion[];
  }>;
};

/** Content types visible in the Content Manager folder navigation. */
export type ContentStructureService = {
  getContentStructure(): Promise<Modules.ContentStructure.ResolvedContentStructure | null>;
};

type FieldSize = NonNullable<Modules.CustomFields.CustomFieldServerOptions['inputSize']>;

/** Sizes of built-in and registered custom fields in the edit view. */
export type FieldSizesService = {
  getAllFieldSizes(): Record<string, FieldSize>;
  hasFieldSize(type: string): boolean;
  getFieldSize(type?: string): FieldSize;
  setFieldSize(type: string, size: FieldSize): void;
  setCustomFieldInputSizes(): void;
};

/** Telemetry sent when the Content Manager list view is configured. */
export type MetricsService = {
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
  generateUIDField(options: UIDField & { data: Record<string, unknown> }): Promise<string>;
  findUniqueUID(options: UIDField & { value: string }): Promise<string>;
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
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'discard';

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

/** A content type or component as the Content Manager models it. */
export type ContentManagerModel<TModel extends Struct.ComponentSchema | Struct.ContentTypeSchema> =
  TModel & {
    apiID: string;
    isDisplayed: boolean;
    attributes: Record<string, any>;
  };

type ComponentsImplementation = ReturnType<typeof createComponentsService>;

/**
 * Component models and their edit and list view configurations. The implementation keeps its
 * published develop types, where lookups through its untyped helper resolve to `unknown`/`any`.
 */
export type ComponentsService = Omit<
  ComponentsImplementation,
  'findAllComponents' | 'findComponent' | 'findComponentsConfigurations'
> & {
  findAllComponents(): ContentManagerModel<Struct.ComponentSchema>[];
  findComponent(uid: UID.Component): ContentManagerModel<Struct.ComponentSchema> | undefined;
  /** Content types and components both hold component attributes. */
  findComponentsConfigurations(
    model: Struct.ComponentSchema | Struct.ContentTypeSchema
  ): ReturnType<ComponentsImplementation['findComponentsConfigurations']>;
};

type ContentTypesImplementation = ReturnType<typeof createContentTypesService>;

/**
 * Content type models and their edit and list view configurations. Configurations are read and
 * written by UID alone, and updates may be partial: the store merges them. The implementation
 * keeps its published develop parameter types.
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
  findAllContentTypes(): ContentManagerModel<Struct.ContentTypeSchema>[];
  findContentType(uid: UID.ContentType): ContentManagerModel<Struct.ContentTypeSchema> | undefined;
  findDisplayedContentTypes(): ContentManagerModel<Struct.ContentTypeSchema>[];
  findContentTypesByKind(kind: {
    kind: Struct.ContentTypeKind | undefined;
  }): ContentManagerModel<Struct.ContentTypeSchema>[];
  findConfiguration(
    contentType: Pick<Struct.ContentTypeSchema, 'uid'>
  ): ReturnType<ContentTypesImplementation['findConfiguration']>;
  updateConfiguration(
    contentType: Pick<Struct.ContentTypeSchema, 'uid'>,
    newConfiguration: Partial<ConfigurationUpdate>
  ): ReturnType<ContentTypesImplementation['updateConfiguration']>;
};

/**
 * Maps content type and component schemas to Content Manager models and DTOs. The implementation
 * keeps its published develop parameter type, a component schema.
 */
export type DataMapperService = Omit<
  ReturnType<typeof createDataMapperService>,
  'toContentManagerModel'
> & {
  toContentManagerModel<TModel extends Struct.ComponentSchema | Struct.ContentTypeSchema>(
    model: TModel
  ): ContentManagerModel<TModel>;
};

/** Content Manager permission registration and configuration checks. */
export type PermissionService = ReturnType<typeof createPermissionService>;

/** Homepage widgets: recent and counted documents. */
export type HomepageService = ReturnType<typeof createHomepageService>;

/** History versions. Only registered when the `cms-content-history` feature is enabled. */
export type HistoryService = ReturnType<typeof createHistoryService>;

/** History recording lifecycles. Only registered when the `cms-content-history` feature is enabled. */
export type LifecyclesService = ReturnType<typeof createLifecyclesService>;

/** Preview URLs. */
export type PreviewService = ReturnType<typeof createPreviewService>;

/** Preview configuration. */
export type PreviewConfigService = ReturnType<typeof createPreviewConfigService>;
