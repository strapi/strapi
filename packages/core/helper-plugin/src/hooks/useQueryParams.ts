import { useCallback, useMemo } from 'react';

import { parse, stringify } from 'qs';
import { useNavigate, useLocation } from 'react-router-dom';

const useQueryParams = <TQuery extends object>(initialParams?: TQuery) => {
  const { search } = useLocation();
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
      let nextQuery = { ...query };

      if (method === 'remove') {
        Object.keys(nextParams).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(nextQuery, key)) {
            // @ts-expect-error – this is fine, if you want to fix it, please do.
            delete nextQuery[key];
          }
        });
      } else {
        nextQuery = { ...query, ...nextParams };
      }

      navigate({ search: stringify(nextQuery, { encode: false }) }, { replace });
    },
    [navigate, query]
  );

  return [{ query, rawQuery: search }, setQuery] as const;
};

export { useQueryParams };
