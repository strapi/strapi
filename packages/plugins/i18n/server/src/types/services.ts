import type { Data, Modules, Schema, Struct, UID } from '@strapi/types';
import type { AILocalizationJobs } from '../../../shared/contracts/ai-localization-jobs';
import type { Settings } from '../validation/settings';
import type permissions from '../services/permissions';
import type sanitize from '../services/sanitize';

/** A stored locale, before the HTTP controller adds `isDefault`. */
export type Locale = {
  id: Data.ID;
  code: string;
  name: string | null;
};

/** Query Engine where filters. Filter operator validation is not part of this first contract. */
export type LocaleFilters = Record<string, unknown>;

/** Data accepted when creating a locale. */
export type LocaleCreateData = {
  code: string;
  name?: string | null;
  createdBy?: Data.ID;
  updatedBy?: Data.ID;
};

/** Data accepted when updating a locale. The code of a locale cannot change. */
export type LocaleUpdateData = {
  name?: string | null;
  updatedBy?: Data.ID;
};

/** `TLocale` with its `isDefault` property set to the computed flag, replacing any existing one. */
type ReplaceIsDefault<TLocale> = Omit<TLocale, 'isDefault'> & { isDefault: boolean };

/** A locale-like record, or a list of them, with `isDefault` set on each. `null` and `undefined` are kept as-is. */
export type WithIsDefault<T> = T extends null | undefined
  ? T
  : T extends readonly (infer TLocale)[]
    ? ReplaceIsDefault<TLocale>[]
    : ReplaceIsDefault<T>;

/** The locales service instance. */
export type LocaleService = {
  /** Finds stored locales using a Query Engine where filter. */
  find(filters?: LocaleFilters): Promise<Locale[]>;
  /** Finds a stored locale, or null when the ID does not exist. */
  findById(id: Data.ID): Promise<Locale | null>;
  /** Finds a stored locale, or null when the code does not exist. */
  findByCode(code: string): Promise<Locale | null>;
  /** Counts locales matching a Query Engine where filter. */
  count(filters?: LocaleFilters): Promise<number>;
  /** Creates a locale. `isDefault` is recorded in the audit log only; use `setDefaultLocale` to change the default. */
  create(locale: LocaleCreateData, options?: { isDefault?: boolean }): Promise<Locale>;
  /** Updates the first locale matching the filter, or resolves to null when none matches. */
  update(filters: LocaleFilters, updates: LocaleUpdateData): Promise<Locale | null>;
  /** Deletes a locale and every entry localized in it, or resolves to null when the ID does not exist. */
  delete(params: { id: Data.ID }): Promise<Locale | null>;
  /** Stores the code of the default locale. */
  setDefaultLocale(locale: { code: string }): Promise<void>;
  /** Returns the code of the default locale, or null when none is stored. */
  getDefaultLocale(): Promise<string | null>;
  /** Adds `isDefault` to one locale or a list of locales. */
  setIsDefault<T extends { code: string } | readonly { code: string }[] | null | undefined>(
    locales: T
  ): Promise<WithIsDefault<T>>;
  /** Creates the initial locale and makes it the default when no locale exists. */
  initDefaultLocale(): Promise<void>;
};

/** Schema properties inspected when listing localized attributes. */
export type AttributeSchema = Pick<Struct.ContentTypeSchema, 'attributes'> & { uid?: string };

/** Content-type localization operations. Missing defaults remain nullable. */
export type ContentTypesService = {
  isLocalizedContentType(model: unknown): boolean;
  getValidLocale(locale?: string | null): Promise<string | null>;
  getLocalizedAttributes(model: AttributeSchema): string[];
  getNonLocalizedAttributes(model: AttributeSchema): string[];
  copyNonLocalizedAttributes(
    model: Struct.ComponentSchema | Struct.ContentTypeSchema,
    entry: Record<string, unknown>
  ): Record<string, unknown>;
  fillNonLocalizedAttributes(
    entry: Record<string, unknown>,
    relatedEntry: Record<string, unknown> | null | undefined,
    options: { model: UID.Schema }
  ): void;
  getNestedPopulateOfNonLocalizedAttributes(modelUID: UID.Schema): string[];
};

/** Locale catalog entries do not have database IDs. */
export type ISOLocalesService = {
  getIsoLocales(): { code: string; name: string }[];
};

/** Telemetry emitted after initialization or a locale change. */
export type MetricsService = {
  sendDidInitializeEvent(): Promise<void>;
  sendDidUpdateI18nLocalesEvent(): Promise<void>;
};

/** Synchronizes the fields shared by all locales of a document. */
export type LocalizationsService = {
  syncNonLocalizedAttributes(
    sourceEntry: Record<string, unknown>,
    model: Schema.ContentType
  ): Promise<void>;
};

/** Removes localization fields, supporting the existing curried invocation. */
export type SanitizeService = ReturnType<typeof sanitize>;

/** Settings are absent until first saved. */
export type SettingsService = {
  getSettings(): Promise<Settings | null>;
  setSettings(value: Settings): Promise<void>;
};

/** Job fields shared by storage callers and HTTP responses. */
export type AILocalizationJob = Pick<
  AILocalizationJobs,
  'id' | 'contentType' | 'relatedDocumentId' | 'sourceLocale' | 'targetLocales' | 'status'
>;

/** A missing job, or one deleted during an update, resolves to null. */
export type AILocalizationJobsService = {
  upsertJobForDocument(params: {
    documentId: string;
    contentType: string;
    sourceLocale: string;
    targetLocales: string[];
    status?: AILocalizationJob['status'];
  }): Promise<AILocalizationJob | null>;
  getJobByDocument(contentType: string, documentId: string): Promise<AILocalizationJob | null>;
  getJobByContentType(contentType: string): Promise<AILocalizationJob | null>;
};

/** Generates the configured AI localizations after document writes. */
export type AILocalizationsService = {
  isEnabled(): Promise<boolean>;
  generateDocumentLocalizations(params: {
    model: UID.ContentType;
    document: Modules.Documents.AnyDocument | null;
  }): Promise<void>;
  setupMiddleware(): void;
};

/** Only permission checks needed to resolve relations in the target locale. */
export type LocaleReadAbility = {
  can(action: string, subject: string): boolean;
};

/** Fetches and prepares document data for filling another locale. */
export type FillFromLocaleService = {
  fetchRawDocument(
    model: UID.ContentType,
    sourceLocale: string,
    documentId?: string
  ): Promise<Modules.Documents.AnyDocument | null>;
  transformDocument(
    document: Record<string, unknown>,
    model: UID.ContentType,
    targetLocale: string,
    userAbility: LocaleReadAbility
  ): Promise<Record<string, unknown>>;
};

/** Existing permission action and engine hooks exposed by i18n. */
export type PermissionsService = ReturnType<typeof permissions>;
