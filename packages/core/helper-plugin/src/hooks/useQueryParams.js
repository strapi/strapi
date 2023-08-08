import { useCallback, useMemo } from 'react';

import { parse, stringify } from 'qs';
import { useHistory, useLocation } from 'react-router-dom';

const useQueryParams = (initialParams) => {
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
    (nextParams, method = 'push') => {
      let nextQuery = { ...query };

      if (method === 'remove') {
        Object.keys(nextParams).forEach((key) => {
          delete nextQuery[key];
        });
      } else {
        nextQuery = { ...query, ...nextParams };
      }

      push({ search: stringify(nextQuery, { encode: false }) });
    },
    [push, query]
  );

  return [{ query, rawQuery: search }, setQuery];
};

export { useQueryParams };
