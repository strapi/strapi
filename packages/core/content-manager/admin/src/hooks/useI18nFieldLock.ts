import { useQueryParams } from '@strapi/admin/strapi-admin';

import { useGetI18nLocalesQuery } from '../services/documents';

import { useDocumentContext } from './useDocumentContext';

/**
 * @internal
 * Whether the Content Manager edit view is on the i18n default locale.
 *
 * Returns `true` when i18n is not enabled on the content type, when the active
 * or default locale cannot be determined yet, or when they match.
 *
 * Prefers `meta.defaultLocale` from the document metadata response — NOT
 * `availableLocales[0]`. That list excludes the currently viewed locale, so
 * when editing the default locale `[0]` is a sibling and would incorrectly
 * report "not default" and lock shared fields.
 *
 * On create (`/create?locale=`), document metadata is not fetched, so
 * `meta.defaultLocale` is missing. Fall back to the i18n locales list to tell
 * whether the active locale is the default. Locking still requires a
 * default-locale document entry (`useHasDefaultLocaleEntry`).
 */
const useIsEditingDefaultLocale = (): boolean => {
  const [{ query }] = useQueryParams<{
    plugins?: { i18n?: { locale?: string } };
  }>();
  const { currentDocument } = useDocumentContext('useIsEditingDefaultLocale');

  const contentTypeLocalized =
    (currentDocument.schema?.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n
      ?.localized === true;

  const currentLocale = query?.plugins?.i18n?.locale ?? currentDocument.document?.locale;
  const metaDefaultLocale = (currentDocument.meta as { defaultLocale?: string | null } | undefined)
    ?.defaultLocale;

  const { data: locales } = useGetI18nLocalesQuery(undefined, {
    skip: !contentTypeLocalized || Boolean(metaDefaultLocale),
  });

  if (!contentTypeLocalized) {
    return true;
  }

  const localesDefault = Array.isArray(locales)
    ? locales.find((locale) => locale.isDefault)?.code
    : undefined;
  const defaultLocale = metaDefaultLocale || localesDefault;

  if (!currentLocale || !defaultLocale) {
    return true;
  }

  return currentLocale === defaultLocale;
};

type DocumentMetaForLock = {
  availableLocales?: Array<{ locale?: string | null }>;
  defaultLocale?: string | null;
};

/**
 * @alpha
 * @public
 * Whether the document being edited has a default-locale entry.
 *
 * `availableLocales` excludes the locale currently open, so a match is a sibling
 * in the default locale. Brand-new creates have no document metadata. A document
 * that exists only in a secondary locale has none either. Shared fields stay
 * editable in both cases: there is no default-locale entry to edit them in.
 */
const useHasDefaultLocaleEntry = (): boolean => {
  const { currentDocument } = useDocumentContext('useHasDefaultLocaleEntry');
  const meta = currentDocument.meta as DocumentMetaForLock | undefined;

  const contentTypeLocalized =
    (currentDocument.schema?.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n
      ?.localized === true;

  const { data: locales } = useGetI18nLocalesQuery(undefined, {
    skip: !contentTypeLocalized || Boolean(meta?.defaultLocale),
  });

  if (!meta) {
    return false;
  }

  const localesDefault = Array.isArray(locales)
    ? locales.find((locale) => locale.isDefault)?.code
    : undefined;
  const defaultLocale = meta.defaultLocale || localesDefault;

  if (!defaultLocale) {
    return false;
  }

  return (meta.availableLocales ?? []).some((entry) => entry.locale === defaultLocale);
};

/**
 * @internal
 * True when a field should be locked because it is not locale-specific and the
 * editor is on a non-default locale that already has a default-locale entry.
 * Root-level only — nested component fields inherit disable from their parent
 * component input.
 */
const useShouldLockNonLocalizedField = (
  attribute: { pluginOptions?: object; type?: string } | undefined,
  options: { isInsideComponent?: boolean } = {}
): boolean => {
  const isDefaultLocale = useIsEditingDefaultLocale();
  const hasDefaultLocaleEntry = useHasDefaultLocaleEntry();

  if (isDefaultLocale || options.isInsideComponent || !hasDefaultLocaleEntry) {
    return false;
  }

  if (!attribute) {
    return false;
  }

  // Match server `isLocalizedAttribute`: relations and uids are always locale-specific
  // even when they omit `pluginOptions.i18n.localized` (CTB never offers that checkbox).
  if (attribute.type === 'relation' || attribute.type === 'uid') {
    return false;
  }

  const i18nOptions = attribute.pluginOptions as { i18n?: { localized?: boolean } } | undefined;

  // Only explicit `localized: true` is localizable for other attribute types.
  return i18nOptions?.i18n?.localized !== true;
};

export { useHasDefaultLocaleEntry, useIsEditingDefaultLocale, useShouldLockNonLocalizedField };
