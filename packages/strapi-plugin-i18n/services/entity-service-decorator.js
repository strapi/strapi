'use strict';

const { has, omit, isArray } = require('lodash/fp');
const { getService } = require('../utils');

const { syncLocalizations, syncNonLocalizedAttributes } = require('./localizations');

const LOCALE_QUERY_FILTER = '_locale';
const SINGLE_ENTRY_ACTIONS = ['findOne', 'update', 'delete'];
const BULK_ACTIONS = ['delete'];

const paramsContain = (key, params) => {
  return (
    has(key, params) ||
    has(key, params._where) ||
    (isArray(params._where) && params._where.some(clause => has(key, clause)))
  );
};

/**
 * Adds default locale or replaces _locale by locale in query params
 * @param {object} params - query params
 */
const wrapParams = async (params = {}, ctx = {}) => {
  const { action } = ctx;

  if (has(LOCALE_QUERY_FILTER, params)) {
    if (params[LOCALE_QUERY_FILTER] === 'all') {
      return omit(LOCALE_QUERY_FILTER, params);
    }

    return {
      ...omit(LOCALE_QUERY_FILTER, params),
      locale: params[LOCALE_QUERY_FILTER],
    };
  }

  const entityDefinedById = paramsContain('id', params) && SINGLE_ENTRY_ACTIONS.includes(action);
  const entitiesDefinedByIds = paramsContain('id_in', params) && BULK_ACTIONS.includes(action);

  if (entityDefinedById || entitiesDefinedByIds) {
    return params;
  }

  const { getDefaultLocale } = getService('locales');

  return {
    ...params,
    locale: await getDefaultLocale(),
  };
};

/**
 * Assigns a valid locale or the default one if not define
 * @param {object} data
 */
const assignValidLocale = async data => {
  const { getValidLocale } = getService('content-types');

  try {
    data.locale = await getValidLocale(data.locale);
  } catch (e) {
    throw strapi.errors.badRequest("This locale doesn't exist");
  }
};

/**
 * Decorates the entity service with I18N business logic
 * @param {object} service - entity service
 */
const decorator = service => ({
  /**
   * Wraps query options. In particular will add default locale to query params
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */

  async wrapOptions(opts = {}, ctx = {}) {
    const wrappedOptions = await service.wrapOptions.call(this, opts, ctx);

    const model = strapi.db.getModel(ctx.model);

    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return wrappedOptions;
    }

    return {
      ...wrappedOptions,
      params: await wrapParams(wrappedOptions.params, ctx),
    };
  },

  /**
   * Creates an entry & make links between it and its related localizaionts
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async create(opts, ctx) {
    const model = strapi.db.getModel(ctx.model);

    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return service.create.call(this, opts, ctx);
    }

    const { data } = opts;
    await assignValidLocale(data);

    const entry = await service.create.call(this, opts, ctx);

    await syncLocalizations(entry, { model });
    await syncNonLocalizedAttributes(entry, { model });
    return entry;
  },

  /**
   * Updates an entry & update related localizations fields
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async update(opts, ctx) {
    const model = strapi.db.getModel(ctx.model);

    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return service.update.call(this, opts, ctx);
    }

    const { data, ...restOptions } = opts;

    const entry = await service.update.call(
      this,
      {
        data: omit(['locale', 'localizations'], data),
        ...restOptions,
      },
      ctx
    );

    await syncNonLocalizedAttributes(entry, { model });
    return entry;
  },
});

module.exports = {
  decorator,
  wrapParams,
};
