'use strict';

const { has, get, omit, isArray } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;
const { getService } = require('../utils');

const LOCALE_QUERY_FILTER = 'locale';
const SINGLE_ENTRY_ACTIONS = ['findOne', 'update', 'delete'];
const BULK_ACTIONS = ['delete'];

const paramsContain = (key, params) => {
  return (
    has(key, params.filters) ||
    (isArray(params.filters) && params.filters.some((clause) => has(key, clause))) ||
    (isArray(get('$and', params.filters)) && params.filters.$and.some((clause) => has(key, clause)))
  );
};

/**
 * Adds default locale or replaces locale by locale in query params
 * @param {object} params - query params
 * @param {object} ctx
 */
const wrapParams = async (params = {}, ctx = {}) => {
  const { action } = ctx;

  if (has(LOCALE_QUERY_FILTER, params)) {
    if (params[LOCALE_QUERY_FILTER] === 'all') {
      return omit(LOCALE_QUERY_FILTER, params);
    }

    return {
      ...omit(LOCALE_QUERY_FILTER, params),
      filters: {
        $and: [{ locale: params[LOCALE_QUERY_FILTER] }].concat(params.filters || []),
      },
    };
  }

  const entityDefinedById = paramsContain('id', params) && SINGLE_ENTRY_ACTIONS.includes(action);
  const entitiesDefinedByIds = paramsContain('id.$in', params) && BULK_ACTIONS.includes(action);

  if (entityDefinedById || entitiesDefinedByIds) {
    return params;
  }

  const { getDefaultLocale } = getService('locales');

  return {
    ...params,
    filters: {
      $and: [{ locale: await getDefaultLocale() }].concat(params.filters || []),
    },
  };
};

/**
 * Assigns a valid locale or the default one if not define
 * @param {object} data
 */
const assignValidLocale = async (data) => {
  const { getValidLocale } = getService('content-types');

  if (!data) {
    return;
  }

  try {
    data.locale = await getValidLocale(data.locale);
  } catch (e) {
    throw new ApplicationError("This locale doesn't exist");
  }
};

/**
 * Decorates the entity service with I18N business logic
 * @param {object} service - entity service
 */
const decorator = (service) => ({
  /**
   * Wraps query options. In particular will add default locale to query params
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async wrapParams(params = {}, ctx = {}) {
    const wrappedParams = await service.wrapParams.call(this, params, ctx);

    const model = strapi.getModel(ctx.uid);

    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return wrappedParams;
    }

    return wrapParams(params, ctx);
  },

  /**
   * Creates an entry & make links between it and its related localizations
   * @param {string} uid - Model uid
   * @param {object} opts - Query options object (params, data, files, populate)
   */
  async create(uid, opts = {}) {
    const model = strapi.getModel(uid);

    const { syncLocalizations, syncNonLocalizedAttributes } = getService('localizations');
    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return service.create.call(this, uid, opts);
    }

    const { data } = opts;
    await assignValidLocale(data);

    const entry = await service.create.call(this, uid, opts);

    await syncLocalizations(entry, { model });
    await syncNonLocalizedAttributes(entry, { model });
    return entry;
  },

  /**
   * Updates an entry & update related localizations fields
   * @param {string} uid
   * @param {string} entityId
   * @param {object} opts - Query options object (params, data, files, populate)
   */
  async update(uid, entityId, opts = {}) {
    const model = strapi.getModel(uid);

    const { syncNonLocalizedAttributes } = getService('localizations');
    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return service.update.call(this, uid, entityId, opts);
    }

    const { data, ...restOptions } = opts;

    const entry = await service.update.call(this, uid, entityId, {
      ...restOptions,
      data: omit(['locale', 'localizations'], data),
    });

    await syncNonLocalizedAttributes(entry, { model });
    return entry;
  },
});

module.exports = () => ({
  decorator,
  wrapParams,
});
