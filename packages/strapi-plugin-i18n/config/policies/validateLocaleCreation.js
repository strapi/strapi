'use strict';

const { get, pick } = require('lodash/fp');
const { getService } = require('../../utils');

const validateLocaleCreation = async (ctx, next) => {
  const { model } = ctx.params;
  const { query, body } = ctx.request;

  const { addLocale, getNewLocalizationsFor, isLocalized } = getService('content-types');
  const modelDef = strapi.getModel(model);

  if (isLocalized(modelDef)) {
    const locale = get('plugins.i18n.locale', query);
    const relatedEntityId = get('plugins.i18n.relatedEntityId', query);

    try {
      await addLocale(body, locale);
    } catch (e) {
      return ctx.badRequest("This locale doesn't exist");
    }

    if (modelDef.kind === 'singleType') {
      const entity = await strapi.entityService.find(
        { params: { _locale: body.locale } },
        { model }
      );
      ctx.request.query = pick(ctx.request.query, 'plugins');
      ctx.request.query.id = get('id', entity);
      ctx.request.query._locale = get('locale', entity);

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
  }

  return next();
};

module.exports = validateLocaleCreation;
