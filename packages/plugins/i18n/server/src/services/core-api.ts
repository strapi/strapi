import _ from 'lodash';
import { prop, pick, reduce, map, keys, toPath, isNil } from 'lodash/fp';
import utils from '@strapi/utils';
import { getService } from '../utils';

const { contentTypes, parseMultipartData, sanitize } = utils;
const { ApplicationError, NotFoundError } = utils.errors;

const { getContentTypeRoutePrefix, isSingleType, getWritableAttributes } = contentTypes;

/**
 * Returns all locales for an entry
 * @param {object} entry
 * @returns {string[]}
 */
const getAllLocales = (entry: any) => {
  return [entry.locale, ...map(prop('locale'), entry.localizations)];
};

/**
 * Returns all localizations ids for an entry
 * @param {object} entry
 * @returns {any[]}
 */
const getAllLocalizationsIds = (entry: any) => {
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
const createSanitizer = (contentType: any) => {
  /**
   * Returns the writable attributes of a content type in the localization routes
   * @returns {string[]}
   */
  const getAllowedAttributes = () => {
    return getWritableAttributes(contentType).filter(
      (attributeName) => !['locale', 'localizations'].includes(attributeName)
    );
  };

  /**
   * Sanitizes uploaded files to keep only writable ones
   * @param {object} files - input files to sanitize
   * @returns {object}
   */
  const sanitizeInputFiles = (files: any) => {
    const allowedFields = getAllowedAttributes();
    return reduce(
      (acc, keyPath) => {
        const [rootKey] = toPath(keyPath);
        if (allowedFields.includes(rootKey)) {
          acc[keyPath] = files[keyPath];
        }

        return acc;
      },
      {} as any,
      keys(files)
    );
  };

  /**
   * Sanitizes input data to keep only writable attributes
   * @param {object} data - input data to sanitize
   * @returns {object}
   */
  const sanitizeInput = (data: any) => {
    return pick(getAllowedAttributes(), data);
  };

  return { sanitizeInput, sanitizeInputFiles };
};

/**
 * Returns a handler to handle localizations creation in the core api
 * @param {object} contentType
 * @returns {(object) => void}
 */
const createLocalizationHandler = (contentType: any) => {
  const handler = createCreateLocalizationHandler(contentType);

  return (ctx: any = {}) => {
    const { id } = ctx.params;
    const { data, files } = parseMultipartData(ctx);

    return handler({ id, data, files });
  };
};

const createCreateLocalizationHandler =
  (contentType: any) =>
  async (args: any = {}) => {
    const { copyNonLocalizedAttributes } = getService('content-types');

    const { sanitizeInput, sanitizeInputFiles } = createSanitizer(contentType);

    const entry = isSingleType(contentType)
      ? await strapi.query(contentType.uid).findOne({ populate: ['localizations'] })
      : await strapi
          .query(contentType.uid)
          .findOne({ where: { id: args.id }, populate: ['localizations'] });

    if (!entry) {
      throw new NotFoundError();
    }

    const { data, files } = args;

    const { findByCode } = getService('locales');

    if (isNil(data.locale)) {
      throw new ApplicationError('locale is missing');
    }

    const matchingLocale = await findByCode(data.locale);
    if (!matchingLocale) {
      throw new ApplicationError('locale is invalid');
    }

    const usedLocales = getAllLocales(entry);
    if (usedLocales.includes(data.locale)) {
      throw new ApplicationError('locale is already used');
    }

    const sanitizedData = {
      ...copyNonLocalizedAttributes(contentType, entry),
      ...sanitizeInput(data),
      locale: data.locale,
      localizations: getAllLocalizationsIds(entry),
    };

    const sanitizedFiles = sanitizeInputFiles(files);

    const newEntry = await strapi.entityService.create(contentType.uid, {
      data: sanitizedData,
      files: sanitizedFiles,
      populate: ['localizations'],
    });

    return sanitize.contentAPI.output(newEntry, strapi.getModel(contentType.uid));
  };

/**
 * Returns a route config to handle localizations creation in the core api
 * @param {object} contentType
 * @returns {{ method: string, path: string, handler: string, config: { policies: string[] }}}
 */
const createLocalizationRoute = (contentType: any) => {
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
const addCreateLocalizationAction = (contentType: any) => {
  const { modelName, apiName } = contentType;

  // in case we add i18N to a content type that is not in an api
  if (!apiName) {
    return;
  }

  const localizationRoute: any = createLocalizationRoute(contentType);

  strapi.api[apiName].routes[modelName].routes.push(localizationRoute);

  strapi.container.get('controllers').extend(`api::${apiName}.${modelName}`, (controller: any) => {
    return Object.assign(controller, {
      createLocalization: createLocalizationHandler(contentType),
    });
  });
};

const mergeCustomizer = (dest: any, src: any) => {
  if (typeof dest === 'string') {
    return `${dest}\n${src}`;
  }
};

/**
 * Add a graphql schema to the plugin's global graphl schema to be processed
 * @param {object} schema
 */
const addGraphqlSchema = (schema: any) => {
  _.mergeWith(strapi.config.get('plugin.i18n.schema.graphql'), schema, mergeCustomizer);
};

/**
 * Add localization mutation & filters to use with the graphql plugin
 * @param {object} contentType
 */
const addGraphqlLocalizationAction = (contentType: any) => {
  const { globalId, modelName } = contentType;

  if (!strapi.plugins.graphql) {
    return;
  }

  const { toSingular, toPlural } = strapi.plugin('graphql').service('naming');

  // We use a string instead of an enum as the locales can be changed in the admin
  // NOTE: We could use a custom scalar so the validation becomes dynamic
  const localeArgs = {
    args: {
      locale: 'String',
    },
  };

  // add locale arguments in the existing queries
  if (isSingleType(contentType)) {
    const queryName = toSingular(modelName);
    const mutationSuffix = _.upperFirst(queryName);

    addGraphqlSchema({
      resolver: {
        Query: {
          [queryName]: localeArgs,
        },
        Mutation: {
          [`update${mutationSuffix}`]: localeArgs,
          [`delete${mutationSuffix}`]: localeArgs,
        },
      },
    });
  } else {
    const queryName = toPlural(modelName);

    addGraphqlSchema({
      resolver: {
        Query: {
          [queryName]: localeArgs,
          [`${queryName}Connection`]: localeArgs,
        },
      },
    });
  }

  // add new mutation to create a localization
  const typeName = globalId;

  const capitalizedName = _.upperFirst(toSingular(modelName));
  const mutationName = `create${capitalizedName}Localization`;
  const mutationDef = `${mutationName}(input: update${capitalizedName}Input!): ${typeName}!`;
  const actionName = `${contentType.uid}.createLocalization`;

  addGraphqlSchema({
    mutation: mutationDef,
    resolver: {
      Mutation: {
        [mutationName]: {
          resolver: actionName,
        },
      },
    },
  });
};

const coreApi = () => ({
  addCreateLocalizationAction,
  addGraphqlLocalizationAction,
  createSanitizer,
  createCreateLocalizationHandler,
});

type CoreApiService = typeof coreApi;

export default coreApi;
export { CoreApiService };
