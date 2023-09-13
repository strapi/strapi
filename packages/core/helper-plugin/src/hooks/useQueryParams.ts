import { useCallback, useMemo } from 'react';

import { parse, ParsedQs, stringify } from 'qs';
import { useHistory, useLocation } from 'react-router-dom';

const useQueryParams = <TQuery extends Record<string, unknown>>(initialParams?: TQuery) => {
  const { search } = useLocation();
  const { push } = useHistory();

  const query = useMemo(() => {
    const searchQuery = search.substring(1);

    if (!search) {
      return initialParams;
    }

    return parse(searchQuery) as TQuery;
  }, [search, initialParams]);

  const setQuery = useCallback(
    (nextParams: TQuery, method: 'push' | 'remove' = 'push') => {
      let nextQuery = { ...query };

      if (method === 'remove') {
        Object.keys(nextParams).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(nextQuery, key)) {
            delete nextQuery[key];
          }
        });
      } else {
        nextQuery = { ...query, ...nextParams };
      }

      push({ search: stringify(nextQuery, { encode: false }) });
    },
    [push, query]
  );

  return [{ query, rawQuery: search }, setQuery] as const;
};

export { useQueryParams };
