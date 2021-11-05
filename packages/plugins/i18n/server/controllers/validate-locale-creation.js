'use strict';

const { get } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;
const { getService } = require('../utils');

const validateLocaleCreation = async (ctx, next) => {
  const { model } = ctx.params;
  const { query, body } = ctx.request;

  const {
    getValidLocale,
    getNewLocalizationsFrom,
    isLocalizedContentType,
    getAndValidateRelatedEntity,
    fillNonLocalizedAttributes,
  } = getService('content-types');

  const modelDef = strapi.getModel(model);

  if (!isLocalizedContentType(modelDef)) {
    return next();
  }

  const locale = get('plugins.i18n.locale', query);
  const relatedEntityId = get('plugins.i18n.relatedEntityId', query);
  // cleanup to avoid creating duplicates in singletypes
  ctx.request.query = {};

  let entityLocale;
  try {
    entityLocale = await getValidLocale(locale);
  } catch (e) {
    throw new ApplicationError("This locale doesn't exist");
  }

  body.locale = entityLocale;

  if (modelDef.kind === 'singleType') {
    const entity = await strapi.entityService.findMany(modelDef.uid, { locale: entityLocale });

    ctx.request.query.locale = body.locale;

    // updating
    if (entity) {
      return next();
    }
  }

  let relatedEntity;
  try {
    relatedEntity = await getAndValidateRelatedEntity(relatedEntityId, model, entityLocale);
  } catch (e) {
    throw new ApplicationError(
      "The related entity doesn't exist or the entity already exists in this locale"
    );
  }

  fillNonLocalizedAttributes(body, relatedEntity, { model });
  const localizations = await getNewLocalizationsFrom(relatedEntity);
  body.localizations = localizations;

  return next();
};

module.exports = validateLocaleCreation;
