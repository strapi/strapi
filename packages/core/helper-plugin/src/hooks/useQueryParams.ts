import { useCallback, useMemo } from 'react';

import { parse, ParsedQs, stringify } from 'qs';
import { useHistory, useLocation } from 'react-router-dom';

type JSON = string | number | boolean | null | { [key: string]: JSON } | Array<JSON>;

type Params = Record<string, JSON>;

const useQueryParams = (initialParams?: Params) => {
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
    (nextParams: Params, method: 'push' | 'remove' = 'push') => {
      let nextQuery = { ...query };

      if (method === 'remove') {
        Object.keys(nextParams).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(nextQuery, key)) {
            delete (nextQuery as ParsedQs | Params)[key];
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
