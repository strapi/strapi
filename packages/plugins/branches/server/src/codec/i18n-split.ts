import { getModel } from './attributes';

import type { Snapshot } from './types';

interface I18nContentTypesService {
  isLocalizedContentType: (model: unknown) => boolean;
  getNonLocalizedAttributes: (model: unknown) => string[];
}

const getI18nContentTypes = (): I18nContentTypesService | null => {
  const plugin = strapi.plugin('i18n');
  if (!plugin) {
    return null;
  }
  return (plugin.service('content-types') as I18nContentTypesService) ?? null;
};

/**
 * Splits touched attributes into the localized ones (stored on the locale's
 * delta row) and the non-localized ones (stored on the `locale: null` row and
 * shared by every locale, mirroring i18n). Without i18n, or for a
 * non-localized content type, everything is "non-localized".
 */
export const splitChangesByLocale = (
  uid: string,
  changes: Snapshot
): { localized: Snapshot; nonLocalized: Snapshot } => {
  const schema = getModel(uid);
  const i18n = getI18nContentTypes();

  if (!i18n || !i18n.isLocalizedContentType(schema)) {
    return { localized: {}, nonLocalized: changes };
  }

  const nonLocalizedNames = new Set(i18n.getNonLocalizedAttributes(schema));
  const localized: Snapshot = {};
  const nonLocalized: Snapshot = {};
  for (const [name, value] of Object.entries(changes)) {
    if (nonLocalizedNames.has(name)) {
      nonLocalized[name] = value;
    } else {
      localized[name] = value;
    }
  }
  return { localized, nonLocalized };
};

export const getDefaultLocale = async (): Promise<string | null> => {
  const plugin = strapi.plugin('i18n');
  if (!plugin) {
    return null;
  }
  const locales = plugin.service('locales') as { getDefaultLocale?: () => Promise<string> };
  return (await locales.getDefaultLocale?.()) ?? null;
};
