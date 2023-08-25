import { useCallback, useMemo } from 'react';

import { parse, stringify } from 'qs';
import { useHistory, useLocation } from 'react-router-dom';

type JSON = string | number | boolean | null | { [key: string]: JSON } | Array<JSON>;

const useQueryParams = <T extends Record<string, JSON>>(initialParams?: T) => {
  const { search } = useLocation();
  const { push } = useHistory();

  const query = useMemo(() => {
    const searchQuery = search.substring(1);

    if (!search) {
      return initialParams;
    }

    return parse(searchQuery);
  }, [search, initialParams]);

  const setQuery = useCallback(
    (nextParams: T, method: 'push' | 'remove' = 'push') => {
      let nextQuery = { ...query };

      if (method === 'remove') {
        Object.keys(nextParams).forEach((key) => {
          if (nextQuery.hasOwnProperty(key)) {
            delete (nextQuery as T)[key];
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
