'use strict';

const { get } = require('lodash/fp');
const { getService } = require('../../utils');

const validateLocaleCreation = async (ctx, next) => {
  const { model } = ctx.params;
  const { query, body } = ctx.request;

  const { getValidLocale, getNewLocalizationsFor, isLocalized } = getService('content-types');

  const modelDef = strapi.getModel(model);

  if (!isLocalized(modelDef)) {
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
    return ctx.badRequest("This locale doesn't exist");
  }

  body.locale = entityLocale;

  if (modelDef.kind === 'singleType') {
    const entity = await strapi.entityService.find(
      { params: { _locale: entityLocale } },
      { model }
    );

    ctx.request.query._locale = body.locale;

    // updating
    if (entity) {
      return next();
    }
  }

  try {
    const localizations = await getNewLocalizationsFor({
      relatedEntityId,
      model,
      locale: body.locale,
    });
    body.localizations = localizations;
  } catch (e) {
    return ctx.badRequest(
      "The related entity doesn't exist or the entity already exists in this locale"
    );
  }

  return next();
};

module.exports = validateLocaleCreation;
