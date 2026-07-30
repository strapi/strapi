/* eslint-disable check-file/filename-naming-convention */
import type * as React from 'react';

/**
 * Extension points other plugins can use to augment the i18n Settings UI without
 * i18n depending on them. Today's only consumer is `@strapi/plugin-spaces`, which
 * adds per-space visibility + default-locale fields to the locale form and two
 * columns to the locale table.
 *
 * Registration happens during the consumer plugin's `bootstrap(app)` via the apis
 * exposed on `app.getPlugin('i18n').apis` (see `admin/src/index.ts`), which is
 * guaranteed to run before any settings page renders — so plain module state is
 * enough, no reactivity needed.
 */

interface LocaleFormExtension {
  id: string;
  /** Rendered inside the locale create/edit modal, below the base form. */
  Component: React.ComponentType<{ mode: 'create' | 'edit' }>;
  /**
   * Extra initial form values, merged into the modal's `initialValues`. Receives
   * the locale row on edit, `undefined` on create.
   */
  getInitialValues?: (locale?: unknown) => Record<string, unknown>;
}

interface LocaleTableColumn {
  id: string;
  header: { id: string; defaultMessage: string };
  Cell: React.ComponentType<{ locale: unknown }>;
}

const localeFormExtensions: LocaleFormExtension[] = [];
const localeTableColumns: LocaleTableColumn[] = [];

const upsertById = <T extends { id: string }>(list: T[], entry: T) => {
  const index = list.findIndex((item) => item.id === entry.id);
  if (index === -1) {
    list.push(entry);
  } else {
    list[index] = entry;
  }
};

export const registerLocaleFormExtension = (extension: LocaleFormExtension) => {
  upsertById(localeFormExtensions, extension);
};

export const registerLocaleTableColumn = (column: LocaleTableColumn) => {
  upsertById(localeTableColumns, column);
};

export const getLocaleFormExtensions = (): readonly LocaleFormExtension[] => localeFormExtensions;

export const getLocaleTableColumns = (): readonly LocaleTableColumn[] => localeTableColumns;

export const getLocaleFormExtensionInitialValues = (locale?: unknown): Record<string, unknown> =>
  localeFormExtensions.reduce(
    (acc, extension) => ({ ...acc, ...(extension.getInitialValues?.(locale) ?? {}) }),
    {}
  );

export type { LocaleFormExtension, LocaleTableColumn };
