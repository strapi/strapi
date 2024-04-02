import { UID } from '@strapi/types';
import { LongHandDocument } from './types';

export const isLocalizedContentType = (uid: UID.Schema) => {
  const model = strapi.getModel(uid);
  return strapi.plugin('i18n').service('content-types').isLocalizedContentType(model);
};

export const getDefaultLocale = () => {
  return strapi.plugin('i18n').service('locales').getDefaultLocale();
};

export const getRelationTargetLocale = (
  relation: LongHandDocument,
  opts: {
    targetUid: UID.Schema;
    sourceUid: UID.Schema;
    sourceLocale?: string | null;
  }
) => {
  const targetLocale = relation.locale || opts.sourceLocale;

  const isTargetLocalized = isLocalizedContentType(opts.targetUid);
  const isSourceLocalized = isLocalizedContentType(opts.sourceUid);

  // Both source and target locales should match
  if (isSourceLocalized && isTargetLocalized) {
    return opts.sourceLocale;
  }

  if (isTargetLocalized) {
    return targetLocale;
  }

  return null;
};
