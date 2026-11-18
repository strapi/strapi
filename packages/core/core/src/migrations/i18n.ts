import { Input } from './draft-publish';

// if i18N enabled set default locale
const enableI18n = async ({ oldContentTypes, contentTypes }: Input) => {
  const { isLocalizedContentType, getDefaultLocale } = strapi.localization;

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
      const defaultLocale = await getDefaultLocale();

      await strapi.db.query(uid).updateMany({
        where: { locale: null },
        data: { locale: defaultLocale },
      });
    }
  }
};

const disableI18n = async ({ oldContentTypes, contentTypes }: Input) => {
  const { isLocalizedContentType, getDefaultLocale } = strapi.localization;

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
      const defaultLocale = await getDefaultLocale();

      // `$ne: null` would match every localized row and delete them all
      if (defaultLocale === null) {
        throw new Error(
          `Cannot disable localization for "${uid}": no default locale is set, so non-default rows cannot be identified.`
        );
      }

      await Promise.all([
        // Delete all entities that are not in the default locale
        strapi.db.query(uid).deleteMany({
          where: { locale: { $ne: defaultLocale } },
        }),
        // Set locale to null for the rest
        strapi.db.query(uid).updateMany({
          where: { locale: { $eq: defaultLocale } },
          data: { locale: null },
        }),
      ]);
    }
  }
};

export { enableI18n as enable, disableI18n as disable };
