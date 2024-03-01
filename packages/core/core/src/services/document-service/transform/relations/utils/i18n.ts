import { Public } from '@strapi/types';
import { errors } from '@strapi/utils';
import { LongHand } from './types';

export const isLocalizedContentType = (uid: Public.UID.Schema) => {
  const model = strapi.getModel(uid);
  return strapi.plugin('i18n').service('content-types').isLocalizedContentType(model);
};

export const getDefaultLocale = () => {
  // TODO: Fix this
  // return strapi.plugin('i18n').service('locales').getDefaultLocale();
  return 'en';
};

export const getRelationTargetLocale = (
  relation: LongHand,
  opts: {
    targetUid: Public.UID.Schema;
    sourceUid: Public.UID.Schema;
    sourceLocale?: string | null;
  }
) => {
  const defaultLocale = getDefaultLocale();
  const targetLocale = relation.locale || opts.sourceLocale || defaultLocale;

  const isTargetLocalized = isLocalizedContentType(opts.targetUid);
  const isSourceLocalized = isLocalizedContentType(opts.sourceUid);

  // Locale validations
  if (isSourceLocalized && isTargetLocalized) {
    // Check the targetLocale matches
    if (targetLocale !== opts.sourceLocale) {
      throw new errors.ValidationError(
        `Relation locale does not match the source locale ${JSON.stringify(relation)}`
      );
    }
  }

  if (isTargetLocalized) {
    return targetLocale;
  }

  return null;
};
