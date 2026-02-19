import { SerializedError } from '@reduxjs/toolkit';
import { ApiError, type UnknownApiError } from '@strapi/admin/strapi-admin';

interface Query {
  plugins?: Record<string, unknown>;
  _q?: string;
  [key: string]: any;
}

/**
 * This type extracts the plugin options from the query
 * and appends them to the root of the query
 */
type TransformedQuery<TQuery extends Query> = Omit<TQuery, 'plugins'> & {
  [key: string]: string;
};

/**
 * @description
 * Extracts status filter from filters.$and and transforms it to a top-level
 * "status" or "hasPublishedVersion" query param
 */
const extractStatusFilter = <T extends Record<string, any>>(params: T): T => {
  const filters = params?.filters;
  if (!filters?.$and || !Array.isArray(filters.$and)) return params;

  const remainingFilters = [];
  const statusFilters = [];

  for (const filter of filters.$and) {
    if (!filter || typeof filter !== 'object' || !('__status' in filter) || !filter.__status?.$eq) {
      remainingFilters.push(filter);
    } else {
      statusFilters.push(filter);
    }
  }

  if (statusFilters.length === 0) return params;

  const modifiedQuery: Record<string, any> = {
    ...params,
    filters: remainingFilters.length > 0 ? { ...filters, $and: remainingFilters } : undefined,
  };

  // Currently the UI has no logic to prevent multiple filters being applied to an enum field.
  // Technically, multiple filters on an enum field should produce no result, which is why
  // this has the ability to apply mutually exclusive filters.
  for (const statusFilter of statusFilters) {
    const value = statusFilter.__status.$eq;

    if (value === 'published') {
      modifiedQuery.status = 'published';
    }

    if (value === 'draft') {
      modifiedQuery.hasPublishedVersion = 'false';
    }
  }

  return modifiedQuery as T;
};

/**
 * @description
 * Creates a valid query params object for get requests
 * ie. plugins[i18n][locale]=en becomes locale=en
 */
const buildValidParams = <TQuery extends Query>(query: TQuery): TransformedQuery<TQuery> => {
  if (!query) return query;

  // Extract pluginOptions from the query, they shouldn't be part of the URL
  const { plugins: _, ...validQueryParams } = {
    ...query,
    ...Object.values(query?.plugins ?? {}).reduce<Record<string, string>>(
      (acc, current) => Object.assign(acc, current),
      {}
    ),
  };

  // Hoist status filter to the top level of the query params
  const validQueryParamsWithStatus = extractStatusFilter(validQueryParams);

  return validQueryParamsWithStatus;
};

type BaseQueryError = ApiError | UnknownApiError;

const isBaseQueryError = (error: BaseQueryError | SerializedError): error is BaseQueryError => {
  return error.name !== undefined;
};

export { isBaseQueryError, buildValidParams };
export type { BaseQueryError, UnknownApiError };
