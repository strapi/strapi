import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'qs';

const useQueryParams = initialParams => {
  const { search } = useLocation();
  const { push } = useHistory();

  useEffect(() => {
    if (!search && initialParams) {
      const newSearch = stringify(initialParams);

      push({ search: newSearch });
    }
  }, [initialParams, push, search]);

  const query = useMemo(() => {
    const searchQuery = search.substring(1);

    if (!search) {
      return initialParams;
    }

    return parse(searchQuery);
  }, [initialParams, search]);

  const setQuery = useCallback(
    (nextParams, method = 'push') => {
      let nextQuery = { ...query };

      if (method === 'remove') {
        Object.keys(nextParams).forEach(key => {
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

export default useQueryParams;
