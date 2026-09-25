import type { Data } from '@strapi/types';

/** A stored locale, before the HTTP controller adds `isDefault`. */
export type Locale = {
  id: Data.ID;
  code: string;
  name: string | null;
};

/** Query Engine where filters. Filter operator validation is not part of this first contract. */
export type LocaleFilters = Record<string, unknown>;

/**
 * The locales service instance. Read operations expose stored locale records.
 * Write and enrichment operations retain their existing permissive signatures while
 * their contracts are migrated separately.
 */
export type LocaleService = {
  /** Finds stored locales using a Query Engine where filter. */
  find(filters?: LocaleFilters): Promise<Locale[]>;
  /** Finds a stored locale, or null when the ID does not exist. */
  findById(id: Data.ID): Promise<Locale | null>;
  /** Finds a stored locale, or null when the code does not exist. */
  findByCode(code: string): Promise<Locale | null>;
  /** Counts locales matching a Query Engine where filter. */
  count(filters?: LocaleFilters): Promise<number>;
  create(locale: any, options?: { isDefault?: boolean }): Promise<any>;
  update(params: any, updates: any): Promise<any>;
  delete(params: any): Promise<any>;
  setDefaultLocale(locale: any): Promise<void>;
  getDefaultLocale(): Promise<string | null>;
  setIsDefault(locales: any): Promise<any>;
  initDefaultLocale(): Promise<void>;
};
