import type { Struct, UID } from '..';

/** Localization operations supplied by an optional plugin during its register lifecycle. */
export type LocalizationProvider = {
  isLocalizedContentType(model: Struct.ContentTypeSchema | Struct.ComponentSchema): boolean;
  getDefaultLocale(): Promise<string | null>;
  getLocales(): Promise<Array<{ code: string; name: string }>>;
  getNestedPopulateOfNonLocalizedAttributes(modelUID: UID.Schema): string[];
  getNonLocalizedAttributes(model: Struct.ContentTypeSchema | Struct.ComponentSchema): string[];
  /** Fill missing nonlocalized fields in `entry` from another locale of the same document. */
  fillNonLocalizedAttributes(
    entry: Record<string, unknown>,
    relatedEntry: Record<string, unknown>,
    options: { model: UID.ContentType }
  ): void;
};

/** Core's localization capability, with inert defaults when no provider is registered. */
export type Localization = LocalizationProvider & {
  /** Whether a provider is registered, to tell "no localization plugin" from "zero locales". */
  isEnabled(): boolean;
  /**
   * Install the provider before database migrations and content-type synchronization run.
   * Only one provider can be registered per application: a second registration throws.
   * Reads made during the register lifecycle of a plugin ordered before the provider's own
   * plugin (or of an API module) see the inert defaults; read from bootstrap onward, or
   * check `isEnabled()` first.
   */
  register(provider: LocalizationProvider): void;
};
