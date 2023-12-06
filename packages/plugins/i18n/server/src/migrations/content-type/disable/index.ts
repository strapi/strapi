import { getService } from '../../../utils';
import { DEFAULT_LOCALE } from '../../../constants';

// Disable i18n on CT -> Delete all entities that are not in the default locale
export default async ({ oldContentTypes, contentTypes }: any) => {
  const { isLocalizedContentType } = getService('content-types');
  const { getDefaultLocale } = getService('locales');

  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    // if i18N is disabled remove non default locales before sync
    if (isLocalizedContentType(oldContentType) && !isLocalizedContentType(contentType)) {
      const defaultLocale = (await getDefaultLocale()) || DEFAULT_LOCALE.code;

      await strapi.db
        .queryBuilder(uid)
        .delete()
        .where({ locale: { $ne: defaultLocale } })
        .execute();
    }
  }
};
