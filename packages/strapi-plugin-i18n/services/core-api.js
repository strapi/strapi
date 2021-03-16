'use strict';

const _ = require('lodash');
const { has, prop, pick, omit, pipe, map } = require('lodash/fp');
const { contentTypes, parseMultipartData, sanitizeEntity } = require('strapi-utils');

const { getService } = require('../utils');

const { getContentTypeRoutePrefix, isSingleType, getWritableAttributes } = contentTypes;

/**
 * Returns a parsed request body. It handles whether the body is multipart or not
 * @param {object} ctx - Koa request context
 * @returns {{ data: { [key: string]: any }, files: { [key: string]: any } }}
 */
const parseRequest = ctx => {
  if (ctx.is('multipart')) {
    return parseMultipartData(ctx);
  } else {
    return { data: ctx.request.body, files: {} };
  }
};

/**
 * Returns a handler to handle localizations creation in the core api
 * @param {object} contentType
 * @returns {(object) => void}
 */
const createLocalizationHandler = contentType => {
  const { getNonLocalizedAttributes, copyNonLocalizedAttributes } = getService('content-types');

  const sanitizeInput = data => {
    return pipe(
      pick(getWritableAttributes(contentType)),
      omit(getNonLocalizedAttributes(contentType))
    )(data);
  };

  const getAllLocales = entry => {
    return [entry.locale, ...map(prop('locale'), entry.localizations)];
  };

  const getAllLocalizations = entry => {
    return [entry.id, ...map(prop('id'), entry.localizations)];
  };

  /**
   * Create localized entry from another one
   */
  const createFromBaseEntry = async (ctx, entry) => {
    const { data, files } = parseRequest(ctx);

    const { findByCode } = getService('locales');

    if (!has('locale', data)) {
      return ctx.badRequest('locale.missing');
    }

    const matchingLocale = await findByCode(data.locale);
    if (!matchingLocale) {
      return ctx.badRequest("This locale doesn't exist");
    }

    const usedLocales = getAllLocales(entry);
    if (usedLocales.includes(data.locale)) {
      return ctx.badRequest('locale.already.used');
    }

    const sanitizedData = {
      ...copyNonLocalizedAttributes(contentType, entry),
      ...sanitizeInput(data),
      locale: data.locale,
      localizations: getAllLocalizations(entry),
    };

    const sanitizedFiles = sanitizeInput(files);

    const newEntry = await strapi.entityService.create(
      { data: sanitizedData, files: sanitizedFiles },
      { model: contentType.uid }
    );

    ctx.body = sanitizeEntity(newEntry, { model: strapi.getModel(contentType.uid) });
  };

  if (isSingleType(contentType)) {
    return async function(ctx) {
      const entry = await strapi.query(contentType.uid).findOne();

      if (!entry) {
        return ctx.notFound('Invalid baseEntityId');
      }

      await createFromBaseEntry(ctx, entry);
    };
  }

  return async function(ctx) {
    const { id: baseEntryId } = ctx.params;

    const entry = await strapi.query(contentType.uid).findOne({ id: baseEntryId });

    if (!entry) {
      return ctx.notFound('baseEntryId.invalid');
    }

    await createFromBaseEntry(ctx, entry);
  };
};

/**
 * Returns a route config to handle localizations creation in the core api
 * @param {object} contentType
 * @returns {{ method: string, path: string, handler: string, config: { policies: string[] }}}
 */
const createLocalizationRoute = contentType => {
  const { modelName } = contentType;

  const routePrefix = getContentTypeRoutePrefix(contentType);
  const routePath = isSingleType(contentType)
    ? `/${routePrefix}/localizations`
    : `/${routePrefix}/:id/localizations`;

  return {
    method: 'POST',
    path: routePath,
    handler: `${modelName}.createLocalization`,
    config: {
      policies: [],
    },
  };
};

/**
 * Adds a route & an action to the core api controller of a content type to allow creating new localizations
 * @param {object} contentType
 */
const addCreateLocalizationAction = contentType => {
  const { modelName, apiName } = contentType;

  const localizationRoute = createLocalizationRoute(contentType);

  const coreApiControllerPath = `api.${apiName}.controllers.${modelName}.createLocalization`;
  const handler = createLocalizationHandler(contentType);

  strapi.config.routes.push(localizationRoute);

  _.set(strapi, coreApiControllerPath, handler);
};

module.exports = {
  addCreateLocalizationAction,
};
