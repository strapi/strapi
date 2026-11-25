import { SerializedError } from '@reduxjs/toolkit';
import { ApiError, type UnknownApiError } from '@strapi/admin/strapi-admin';

interface Query {
  plugins?: Record<string, unknown>;
  _q?: string;
  [key: string]: unknown;
}

/**
 * This type extracts the plugin options from the query
 * and appends them to the root of the query
 */
type TransformedQuery<TQuery extends Query> = Omit<TQuery, 'plugins'> & {
  [key: string]: unknown;
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
    ...Object.values(query?.plugins ?? {}).reduce<Record<string, unknown>>((acc, current) => {
      if (typeof current === 'object' && current !== null) {
        return Object.assign(acc, current);
      }

      return acc;
    }, {}),
  };

  return validQueryParams;
};

type BaseQueryError = ApiError | UnknownApiError;

const isBaseQueryError = (error: BaseQueryError | SerializedError): error is BaseQueryError => {
  return error.name !== undefined;
};

export { isBaseQueryError, buildValidParams };
export type { BaseQueryError, UnknownApiError };
