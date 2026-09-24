import type { Modules, Struct, UID } from '@strapi/types';
import type { Configuration } from '../../../shared/contracts/content-types';
import type { DocumentManagerService as DocumentManagerFactory } from '../services/document-manager';
import type createDocumentMetadata from '../services/document-metadata';

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
