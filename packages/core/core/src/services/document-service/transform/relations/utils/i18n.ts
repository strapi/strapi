import { UID } from '@strapi/types';
import { LongHandDocument } from './types';

export const isLocalizedContentType = (uid: UID.Schema) => {
  const model = strapi.getModel(uid);
  return strapi.plugin('i18n').service('content-types').isLocalizedContentType(model);
};

export const getDefaultLocale = () => {
  // TODO: V5 make this more performant
  // return strapi.plugin('i18n').service('locales').getDefaultLocale();
  return 'en';
};

export const getRelationTargetLocale = (
  relation: LongHandDocument,
  opts: {
    targetUid: UID.Schema;
    sourceUid: UID.Schema;
    sourceLocale?: string | null;
  }
) => {
  const defaultLocale = getDefaultLocale();
  const targetLocale = relation.locale || opts.sourceLocale || defaultLocale;

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
