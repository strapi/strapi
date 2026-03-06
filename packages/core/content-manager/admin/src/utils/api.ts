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
 * Creates a valid query params object for get requests
 * (e.g. plugins[i18n][locale]=en is merged to root as locale=en).
 * Status filter (__status in filters.$and) is left as-is; the server controller
 * rewrites it before calling the document service.
 */
const buildValidParams = <TQuery extends Query>(query: TQuery): TransformedQuery<TQuery> => {
  if (!query) return query;

  const { plugins: _, ...validQueryParams } = {
    ...query,
    ...Object.values(query?.plugins ?? {}).reduce<Record<string, string>>(
      (acc, current) => Object.assign(acc, current),
      {}
    ),
  };

  return validQueryParams as TransformedQuery<TQuery>;
};

type BaseQueryError = ApiError | UnknownApiError;

const isBaseQueryError = (error: BaseQueryError | SerializedError): error is BaseQueryError => {
  return error.name !== undefined;
};

export { isBaseQueryError, buildValidParams };
export type { BaseQueryError, UnknownApiError };
