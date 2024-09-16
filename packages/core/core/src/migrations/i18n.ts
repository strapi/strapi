import { Input } from './draft-publish';

// if i18N enabled set default locale
const enableI18n = async ({ oldContentTypes, contentTypes }: Input) => {
  const { isLocalizedContentType } = strapi.plugin('i18n')?.service('content-types') ?? {};
  const { getDefaultLocale } = strapi.plugin('i18n')?.service('locales') ?? {};

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
  const { isLocalizedContentType } = strapi.plugin('i18n')?.service('content-types') ?? {};
  const { getDefaultLocale } = strapi.plugin('i18n')?.service('locales') ?? {};

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
