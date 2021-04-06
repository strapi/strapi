'use strict';

const _ = require('lodash');
const { has, prop, pick, reduce, map, keys, toPath } = require('lodash/fp');
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
 * Returns all locales for an entry
 * @param {object} entry
 * @returns {string[]}
 */
const getAllLocales = entry => {
  return [entry.locale, ...map(prop('locale'), entry.localizations)];
};

/**
 * Returns all localizations ids for an entry
 * @param {object} entry
 * @returns {any[]}
 */
const getAllLocalizationsIds = entry => {
  return [entry.id, ...map(prop('id'), entry.localizations)];
};

/**
 * Returns a sanitizer object with a data & a file sanitizer for a content type
 * @param {object} contentType
 * @returns {{
 *    sanitizeInput(data: object): object,
 *    sanitizeInputFiles(files: object): object
 * }}
 */
const createSanitizer = contentType => {
  /**
   * Returns the writable attributes of a content type in the localization routes
   * @returns {string[]}
   */
  const getAllowedAttributes = () => {
    return getWritableAttributes(contentType).filter(
      attributeName => !['locale', 'localizations'].includes(attributeName)
    );
  };

  /**
   * Sanitizes uploaded files to keep only writable ones
   * @param {object} files - input files to sanitize
   * @returns {object}
   */
  const sanitizeInputFiles = files => {
    const allowedFields = getAllowedAttributes();
    return reduce(
      (acc, keyPath) => {
        const [rootKey] = toPath(keyPath);
        if (allowedFields.includes(rootKey)) {
          acc[keyPath] = files[keyPath];
        }

        return acc;
      },
      {},
      keys(files)
    );
  };

  /**
   * Sanitizes input data to keep only writable attributes
   * @param {object} data - input data to sanitize
   * @returns {object}
   */
  const sanitizeInput = data => {
    return pick(getAllowedAttributes(), data);
  };

  return { sanitizeInput, sanitizeInputFiles };
};

/**
 * Returns a handler to handle localizations creation in the core api
 * @param {object} contentType
 * @returns {(object) => void}
 */
const createLocalizationHandler = contentType => {
  const { copyNonLocalizedAttributes } = getService('content-types');

  const { sanitizeInput, sanitizeInputFiles } = createSanitizer(contentType);

  /**
   * Create localized entry from another one
   */
  const createFromBaseEntry = async (ctx, entry) => {
    const { data, files } = parseRequest(ctx);

    const { findByCode } = getService('locales');

    if (!has('locale', data)) {
      throw strapi.errors.badRequest('locale.missing');
    }

    const matchingLocale = await findByCode(data.locale);
    if (!matchingLocale) {
      throw strapi.errors.badRequest('locale.invalid');
    }

    const usedLocales = getAllLocales(entry);
    if (usedLocales.includes(data.locale)) {
      throw strapi.errors.badRequest('locale.already.used');
    }

    const sanitizedData = {
      ...copyNonLocalizedAttributes(contentType, entry),
      ...sanitizeInput(data),
      locale: data.locale,
      localizations: getAllLocalizationsIds(entry),
    };

    const sanitizedFiles = sanitizeInputFiles(files);

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
        throw strapi.errors.notFound('baseEntryId.invalid');
      }

      await createFromBaseEntry(ctx, entry);
    };
  }

  return async function(ctx) {
    const { id: baseEntryId } = ctx.params;

    const entry = await strapi.query(contentType.uid).findOne({ id: baseEntryId });

    if (!entry) {
      throw strapi.errors.notFound('baseEntryId.invalid');
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

/**
 * Add localization mutation & filters to use with the graphql plugin
 * @param {object} contentType
 */
const addGraphqlLocalizationAction = contentType => {
  const { modelName } = contentType;

  if (!strapi.plugins.graphql) {
    return;
  }

  const typeName = _.capitalize(modelName);
  _.mergeWith(
    strapi.plugins.i18n.config.schema.graphql,
    {
      mutation: `
          create${typeName}Localization(input: update${typeName}Input!): ${typeName}!
        `,
      resolver: {
        Mutation: {
          [`create${typeName}Localization`]: {
            resolver: `application::${modelName}.${modelName}.createLocalization`,
          },
        },
      },
    },
    (dest, src) => {
      if (typeof dest === 'string') {
        return `${dest}\n${src}`;
      }
    }
  );
};

module.exports = {
  addCreateLocalizationAction,
  addGraphqlLocalizationAction,
  createSanitizer,
};
