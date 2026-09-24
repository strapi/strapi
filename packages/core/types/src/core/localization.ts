import type { Struct, UID } from '..';

/** Localization operations supplied by an optional plugin during its register lifecycle. */
export type LocalizationProvider = {
  isLocalizedContentType(model: Struct.ContentTypeSchema | Struct.ComponentSchema): boolean;
  getDefaultLocale(): Promise<string | null>;
  getNestedPopulateOfNonLocalizedAttributes(modelUID: UID.Schema): string[];
  /** Fill missing nonlocalized fields in `entry` from another locale of the same document. */
  fillNonLocalizedAttributes(
    entry: Record<string, unknown>,
    relatedEntry: Record<string, unknown>,
    options: { model: UID.ContentType }
  ): void;
};

/** Core's localization capability, with inert defaults when no provider is registered. */
export type Localization = LocalizationProvider & {
  /**
   * Install the provider before database migrations and content-type synchronization run.
   * A later registration replaces the previous provider for this application.
   */
  register(provider: LocalizationProvider): void;
};
