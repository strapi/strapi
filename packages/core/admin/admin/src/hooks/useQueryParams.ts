import { useCallback, useMemo } from 'react';

import { parse, stringify } from 'qs';
import { useNavigate, useLocation } from 'react-router-dom';

type QueryParams = Record<string, unknown>;

const useSearch = () => {
  const { search } = useLocation();

  return useMemo(() => search, [search]);
};

const useQueryParams = <TQuery extends object = QueryParams>(initialParams?: TQuery) => {
  const search = useSearch();
  const navigate = useNavigate();

  const query = useMemo(() => {
    // TODO: investigate why sometimes we're getting the search with a leading `?` and sometimes not.
    const searchQuery = search.startsWith('?') ? search.slice(1) : search;
    if (!search && initialParams) {
      return initialParams;
    }

    return { ...initialParams, ...parse(searchQuery) } as TQuery;
  }, [search, initialParams]);

  const setQuery = useCallback(
    (nextParams: TQuery, method: 'push' | 'remove' = 'push', replace = false) => {
      let nextQuery: Partial<TQuery> = { ...query };

      if (method === 'remove') {
        Object.keys(nextParams).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(nextQuery, key)) {
            delete nextQuery[key as keyof TQuery];
          }
        });
      } else {
        nextQuery = { ...query, ...nextParams };
      }

      /**
       * TODO V6: Encoding should be enabled in this step, via `{ encodeValuesOnly: true }`
       * So the rest of the app doesn't have to worry about it,
       * It's considered a breaking change because callers currently encode values themselves,
       * including the user's custom code, and would end up double-encoding them.
       */
      navigate({ search: stringify(nextQuery, { encode: false }) }, { replace });
    },
    [navigate, query]
  );

  return [{ query, rawQuery: search }, setQuery] as const;
};

/**
 * These functions are used to encode query values when writing them to the URL.
 * As stated above, it should be handled by `useQueryParams` instead, but that would be a breaking change.
 */

const deepEncodeQueryValues = <T>(value: T): T => {
  if (typeof value === 'string') {
    return encodeURIComponent(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map(deepEncodeQueryValues) as T;
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deepEncodeQueryValues(entry)])
    ) as T;
  }

  return value;
};

const withEncodedUserParams = <
  T extends object,
  TQuery extends { filters?: unknown; _q?: unknown },
>(
  query: TQuery,
  nextParams: T
): T & { filters?: TQuery['filters']; _q?: TQuery['_q'] } => ({
  ...(query.filters === undefined ? {} : { filters: deepEncodeQueryValues(query.filters) }),
  ...(query._q === undefined ? {} : { _q: deepEncodeQueryValues(query._q) }),
  ...nextParams,
});

export { useQueryParams, deepEncodeQueryValues, withEncodedUserParams };
