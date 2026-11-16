import type { UID } from '@strapi/types';

import { getDefaultLocale, isLocalizedContentType } from '../utils/i18n';
import { mapRelation, traverseEntityRelations } from '../utils/map-relation';

const setDefaultLocaleToRelation = <T extends Record<string, any>>(
  relation: T,
  defaultLocale: string | null
): T & { locale: string | null } => {
  const position = relation.position;
  if (position && typeof position === 'object' && !position.locale) {
    position.locale = defaultLocale;
  }

  return { ...relation, locale: defaultLocale };
};

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

  // Store the default locale lookup, not only its result: relations are mapped concurrently, so
  // caching the value alone lets every one of them issue the query before the first one answers
  let defaultLocale: Promise<string | null> | null = null;

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
        defaultLocale ??= Promise.resolve(getDefaultLocale());

        return setDefaultLocaleToRelation(relation, await defaultLocale);
      }, value as any);

      // @ts-expect-error - fix type
      set(key, relation);
    },
    { schema: strapi.getModel(uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { setDefaultLocaleToRelation, setDefaultLocaleToRelations };
