import { useQueryParams } from '@strapi/admin/strapi-admin';

import { useDocumentContext } from './useDocumentContext';

/**
 * @internal
 * Whether the Content Manager edit view is on the i18n default locale.
 *
 * Returns `true` when i18n is not enabled on the content type, when the active
 * or default locale cannot be determined yet, or when they match.
 *
 * Uses `meta.defaultLocale` from the document metadata response — NOT
 * `availableLocales[0]`. That list excludes the currently viewed locale, so
 * when editing the default locale `[0]` is a sibling and would incorrectly
 * report "not default" and lock shared fields.
 */
const useIsEditingDefaultLocale = (): boolean => {
  const [{ query }] = useQueryParams<{
    plugins?: { i18n?: { locale?: string } };
  }>();
  const { currentDocument } = useDocumentContext('useIsEditingDefaultLocale');

  const contentTypeLocalized =
    (currentDocument.schema?.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n
      ?.localized === true;

  if (!contentTypeLocalized) {
    return true;
  }

  const currentLocale = query?.plugins?.i18n?.locale ?? currentDocument.document?.locale;
  const defaultLocale = (currentDocument.meta as { defaultLocale?: string | null } | undefined)
    ?.defaultLocale;

  if (!currentLocale || !defaultLocale) {
    return true;
  }

  return currentLocale === defaultLocale;
};

/**
 * @internal
 * True when a field should be locked because it is not locale-specific and the
 * editor is on a non-default locale. Root-level only — nested component fields
 * inherit disable from their parent component input.
 */
const useShouldLockNonLocalizedField = (
  attribute: { pluginOptions?: object; type?: string } | undefined,
  options: { isInsideComponent?: boolean } = {}
): boolean => {
  const isDefaultLocale = useIsEditingDefaultLocale();

  if (isDefaultLocale || options.isInsideComponent) {
    return false;
  }

  if (!attribute) {
    return false;
  }

  // Match server `isLocalizedAttribute`: relations and uids are always locale-specific
  // even when they omit `pluginOptions.i18n.localized` (CTB never offers that checkbox).
  // Dynamic zones are also excluded: admin inheritance skips them (see useDocument), so
  // locking an empty DZ on secondary locales is misleading.
  if (
    attribute.type === 'relation' ||
    attribute.type === 'uid' ||
    attribute.type === 'dynamiczone'
  ) {
    return false;
  }

  const i18nOptions = attribute.pluginOptions as { i18n?: { localized?: boolean } } | undefined;

  // Only explicit `localized: true` is localizable for other attribute types.
  return i18nOptions?.i18n?.localized !== true;
};

export { useIsEditingDefaultLocale, useShouldLockNonLocalizedField };
