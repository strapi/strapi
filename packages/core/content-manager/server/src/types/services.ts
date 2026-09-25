import type { Modules, Struct, UID } from '@strapi/types';
import type { Configuration } from '../../../shared/contracts/content-types';
import type { DocumentManagerService as DocumentManagerFactory } from '../services/document-manager';
import type createDocumentMetadata from '../services/document-metadata';
import type createComponentsService from '../services/components';
import type createContentTypesService from '../services/content-types';
import type createDataMapperService from '../services/data-mapper';
import type createPermissionService from '../services/permission';
import type { createHomepageService } from '../homepage/services/homepage';
import type { createHistoryService } from '../history/services/history';
import type { createLifecyclesService } from '../history/services/lifecycles';
import type { createPreviewService } from '../preview/services/preview';
import type { createPreviewConfigService } from '../preview/services/preview-config';

/** Existing document operations, including nullable lookups and optional clone results. */
export type DocumentManagerService = ReturnType<DocumentManagerFactory>;

/** Metadata operations shared by collection, single type and relation controllers. */
export type DocumentMetadataService = ReturnType<typeof createDocumentMetadata>;

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

// TODO @Nico tighten contract: sanitizers forward the admin permissions manager's `unknown` results,
// which callers use as documents and queries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sanitized = any;

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
  sanitizeQuery(query: unknown, options?: { action?: string }): Promise<Sanitized>;
  sanitizeCreateInput(data: unknown): Promise<Sanitized>;
  sanitizeUpdateInput(entity: unknown): (data: unknown) => Promise<Sanitized>;
  validateQuery(query: unknown, options?: { action?: string }): Promise<unknown>;
  validateInput(action: string, data: unknown, entity?: unknown): Promise<unknown>;
  /** Sanitizes a query, then restricts it to what the ability permits. */
  sanitizedQuery: ((query: unknown, options?: { action?: string }) => Promise<Sanitized>) &
    Record<PermissionCheckerAction, (query: unknown) => Promise<Sanitized>>;
};

export type PermissionCheckerService = {
  // TODO @Nico tighten contract: `userAbility` is a CASL `Ability`; some callers hold it untyped.
  create(options: { userAbility: unknown; model: string }): PermissionChecker;
};

/** Component models and their edit and list view configurations. */
export type ComponentsService = ReturnType<typeof createComponentsService>;

/** Content type models and their edit and list view configurations. */
export type ContentTypesService = ReturnType<typeof createContentTypesService>;

/** Maps content type and component schemas to Content Manager models and DTOs. */
export type DataMapperService = ReturnType<typeof createDataMapperService>;

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
