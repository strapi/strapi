import type { UID } from '@strapi/types';

import { getDefaultLocale, isLocalizedContentType } from '../utils/i18n';
import { mapRelation, traverseEntityRelations } from '../utils/map-relation';

/**
 * In scenarios like Non i18n CT -> i18n CT
 * relations can be connected to multiple locales,
 * in case user does not provide the locale, this sets it to the default one.
 */
const setDefaultLocaleToRelations = (data: Record<string, any>, uid: UID.Schema) => {
  // I18n CT -> anything will already have a locale set (source locale)
  if (isLocalizedContentType(uid)) {
    return data;
  }

  // Store the default locale to avoid multiple calls
  let defaultLocale: string;

  /**
   * Traverse the entity input data and set the default locale to relations
   */
  return traverseEntityRelations(
    async ({ key, value }, { set }) => {
      /**
       * Assign default locale on long hand expressed relations
       * e.g { documentId } -> { documentId, locale }
       */
      const relation = await mapRelation(async (relation) => {
        if (!relation || !relation?.documentId || relation?.locale) {
          return relation;
        }

        // Set default locale if not provided
        if (!defaultLocale) {
          defaultLocale = await getDefaultLocale();
        }

        // Assign default locale to the positional argument
        const position = relation.position;
        if (position && typeof position === 'object' && !position.locale) {
          relation.position.locale = defaultLocale;
        }

        return { ...relation, locale: defaultLocale };
      }, value as any);

      // @ts-expect-error - fix type
      set(key, relation);
    },
    { schema: strapi.getModel(uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { setDefaultLocaleToRelations };
