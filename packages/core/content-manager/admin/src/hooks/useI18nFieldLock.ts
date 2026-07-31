import { useQueryParams } from '@strapi/admin/strapi-admin';

import { useDocumentContext } from './useDocumentContext';

/**
 * @internal
 * Whether the Content Manager edit view is on the i18n default locale.
 *
 * Returns `true` when i18n is not enabled on the content type, when the active
 * locale cannot be determined yet, or when it matches `meta.availableLocales[0]`
 * (server sorts the default locale first).
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
  const defaultLocale = (
    currentDocument.meta?.availableLocales?.[0] as { locale?: string } | undefined
  )?.locale;

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

  const i18nOptions = attribute.pluginOptions as { i18n?: { localized?: boolean } } | undefined;

  // Matches server/admin i18n semantics: only explicit `localized: true` is localizable.
  return i18nOptions?.i18n?.localized !== true;
};

export { useIsEditingDefaultLocale, useShouldLockNonLocalizedField };
