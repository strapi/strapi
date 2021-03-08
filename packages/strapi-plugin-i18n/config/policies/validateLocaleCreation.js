'use strict';

const { get } = require('lodash/fp');
const { getService } = require('../../utils');

const validateLocaleCreation = async (ctx, next) => {
  const { model } = ctx.params;
  const { query, body } = ctx.request;

  const ctService = getService('content-types');

  if (ctService.isLocalized(model)) {
    const locale = get('plugins.i18n.locale', query);
    const relatedEntityId = get('plugins.i18n.relatedEntityId', query);

    try {
      await ctService.addLocale(body, locale);
    } catch (e) {
      return ctx.badRequest("This locale doesn't exist");
    }

    try {
      await ctService.addLocalizations(body, { relatedEntityId, model, locale: body.locale });
    } catch (e) {
      return ctx.badRequest(
        "The related entity doesn't exist or the entity already exists in this locale"
      );
    }
  }

  return next();
};

module.exports = validateLocaleCreation;
