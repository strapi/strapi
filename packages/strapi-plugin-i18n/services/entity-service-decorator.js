'use strict';

const { has, omit } = require('lodash/fp');

const { getDefaultLocale } = require('./locales');
const { isLocalized } = require('./content-types');
const { syncLocalizations, updateNonLocalizedFields } = require('./localizations');

const LOCALE_QUERY_FILTER = '_locale';
const SINGLE_ENTRY_ACTIONS = ['findOne', 'update', 'delete'];

/**
 * Adds default locale or replaces _locale by locale in query params
 * @param {object} params - query params
 */
const wrapParams = async (params = {}, ctx = {}) => {
  const { action } = ctx;

  if (has('id', params) && SINGLE_ENTRY_ACTIONS.includes(action)) {
    return params;
  }

  if (has(LOCALE_QUERY_FILTER, params)) {
    if (params[LOCALE_QUERY_FILTER] === 'all') {
      return omit(LOCALE_QUERY_FILTER, params);
    }

    return {
      ...omit(LOCALE_QUERY_FILTER, params),
      locale: params[LOCALE_QUERY_FILTER],
    };
  }

  return {
    ...params,
    locale: await getDefaultLocale(),
  };
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

    if (!isLocalized(model)) {
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
    const entry = await service.create.call(this, opts, ctx);

    if (isLocalized(model)) {
      await syncLocalizations(entry, { model });
    }

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

    const { data, ...restOptions } = opts;

    const entry = await service.update.call(
      this,
      {
        data: omit(['locale', 'localizations'], data),
        ...restOptions,
      },
      ctx
    );

    if (isLocalized(model)) {
      await updateNonLocalizedFields(entry, { model });
    }

    return entry;
  },
});

module.exports = {
  decorator,
  wrapParams,
};
