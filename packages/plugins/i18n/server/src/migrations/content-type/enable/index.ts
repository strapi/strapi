import { getService } from '../../../utils';
import { DEFAULT_LOCALE } from '../../../constants';

// if i18N enabled set default locale
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

    if (!isLocalizedContentType(oldContentType) && isLocalizedContentType(contentType)) {
      const defaultLocale = (await getDefaultLocale()) || DEFAULT_LOCALE.code;

      await strapi.db
        .queryBuilder(uid)
        .update({ locale: defaultLocale })
        .where({ locale: null })
        .execute();
    }
  }
};
