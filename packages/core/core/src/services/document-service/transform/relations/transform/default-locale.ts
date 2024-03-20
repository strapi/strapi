import { Common } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { getDefaultLocale, isLocalizedContentType } from '../utils/i18n';

import { traverseRelation } from '../utils/traverse-relation';

type Visitor = Parameters<typeof traverseEntity>[0];

/**
 * In scenarios like Non i18n CT -> i18n CT
 * relations can be connected to multiple locales,
 * in case user does not provide the locale, this sets it to the default one.
 */
const setDefaultLocaleToRelations = (data: Record<string, any>, uid: Common.UID.Schema) => {
  // I18n CT -> anything will already have a locale set (source locale)
  if (isLocalizedContentType(uid)) {
    return data;
  }

  // Store the default locale to avoid multiple calls
  let defaultLocale: string;

  /**
   * Traverse the entity input data and set the default locale to relations
   */
  const dataVisitor: Visitor = async ({ key, value, attribute }, { set }) => {
    if (attribute.type !== 'relation') {
      return;
    }

    // Ignore non-18n -> non-i18n relations
    const target = attribute.target as Common.UID.Schema | undefined;
    if (!target || !isLocalizedContentType(target)) {
      return;
    }

    /**
     * Assign default locale on long hand expressed relations
     * e.g { documentId } -> { documentId, locale }
     */
    const relation = await traverseRelation(
      {
        async onLongHand(relation) {
          // @ts-expect-error - fix type
          if (!relation.documentId || relation.locale) {
            return relation;
          }

          // Set default locale if not provided
          if (!defaultLocale) {
            defaultLocale = await getDefaultLocale();
          }
          return { ...relation, locale: defaultLocale };
        },
      },
      value as any
    );

    // @ts-expect-error - fix type
    set(key, relation);
  };

  return traverseEntity(dataVisitor, { schema: strapi.getModel(uid) }, data);
};

export { setDefaultLocaleToRelations as transformDataIdsVisitor };
