import { has, get, omit, isArray } from 'lodash/fp';
import type { Schema } from '@strapi/types';

import { getService } from '../utils';

const LOCALE_QUERY_FILTER = 'locale';
const SINGLE_ENTRY_ACTIONS = ['findOne', 'update', 'delete'];
const BULK_ACTIONS = ['delete'];

const paramsContain = (key: any, params: any) => {
  return (
    has(key, params.filters) ||
    (isArray(params.filters) && params.filters.some((clause: any) => has(key, clause))) ||
    (isArray(get('$and', params.filters)) &&
      params.filters.$and.some((clause: any) => has(key, clause)))
  );
};

/**
 * Adds default locale or replaces locale by locale in query params
 * @param {object} params - query params
 * @param {object} ctx
 */
const wrapParams = async (params: any = {}, ctx: any = {}) => {
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
 * Decorates the entity service with I18N business logic
 * @param {object} service - entity service
 */
const decorator = (service: any) => ({
  /**
   * Wraps result
   * @param {object} result - result object of query
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async wrapResult(result = {}, ctx = {}) {
    return service.wrapResult.call(this, result, ctx);
  },

  /**
   * Wraps query options. In particular will add default locale to query params
   * @param {object} params - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async wrapParams(params: any = {}, ctx: any = {}) {
    const wrappedParams = await service.wrapParams.call(this, params, ctx);

    const model = strapi.getModel(ctx.uid);

    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return wrappedParams;
    }

    return wrapParams(wrappedParams, ctx);
  },

  /**
   * Find an entry or several if fetching all locales
   * @param {string} uid - Model uid
   * @param {object} opts - Query options object (params, data, files, populate)
   */
  async findMany(uid: any, opts: any) {
    const model = strapi.getModel(uid) as Schema.ContentType;

    const { isLocalizedContentType } = getService('content-types');

    if (!isLocalizedContentType(model)) {
      return service.findMany.call(this, uid, opts);
    }

    const { kind } = model;

    if (kind === 'singleType') {
      if (opts[LOCALE_QUERY_FILTER] === 'all') {
        // TODO Fix so this won't break lower lying find many wrappers
        const wrappedParams = await this.wrapParams(opts, { uid, action: 'findMany' });
        const query = strapi.get('query-params').transform(uid, wrappedParams);
        const entities = await strapi.db.query(uid).findMany(query);
        return this.wrapResult(entities, { uid, action: 'findMany' });
      }

      // This one gets transformed into a findOne on a lower layer
      return service.findMany.call(this, uid, opts);
    }

    return service.findMany.call(this, uid, opts);
  },
});

const entityServiceDecorator = () => ({
  decorator,
  wrapParams,
});

type EntityServiceDecoratorService = typeof entityServiceDecorator;

export default entityServiceDecorator;
export type { EntityServiceDecoratorService };
