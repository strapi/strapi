import type { Data } from '@strapi/types';

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
