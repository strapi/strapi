import { SerializedError } from '@reduxjs/toolkit';
import { type UnknownApiError, type ApiError } from '@strapi/admin/strapi-admin';

export type BaseQueryError = ApiError | UnknownApiError | SerializedError;

const isBaseQueryError = (error: BaseQueryError): error is ApiError | UnknownApiError => {
  return error.name !== undefined;
};

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
 * Creates a valid query params object for get requests
 * ie. plugins[18n][locale]=en becomes locale=en
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

  if ('_q' in validQueryParams) {
    // Encode the search query here since the paramsSerializer will not
    // @ts-expect-error – TODO: fix this type error
    validQueryParams._q = encodeURIComponent(validQueryParams._q);
  }

  return validQueryParams;
};

export { isBaseQueryError, buildValidParams };
