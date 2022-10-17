import { useState, useEffect } from 'react';
import { useInfiniteQuery } from 'react-query';

import { axiosInstance } from '../../../core/utils';

import { normalizeRelations } from '../../components/RelationInputDataManager/utils';

export const useRelation = (cacheKey, { name, relation, search }) => {
  const [searchParams, setSearchParams] = useState({});

  /**
   * This runs in `useInfiniteQuery` to actually fetch the data
   */
  const fetchRelations = async ({ pageParam = 1 }) => {
    try {
      const { data } = await axiosInstance.get(relation?.endpoint, {
        params: {
          ...(relation.pageParams ?? {}),
          page: pageParam,
        },
      });

      return data;
    } catch (err) {
      return null;
    }
  };

  const fetchSearch = async ({ pageParam = 1 }) => {
    try {
      const { data } = await axiosInstance.get(search.endpoint, {
        params: {
          ...(search.pageParams ?? {}),
          ...searchParams,
          page: pageParam,
        },
      });

      return data;
    } catch (err) {
      return null;
    }
  };

  const { onLoadRelationsCallback, normalizeArguments } = relation;

  const relationsRes = useInfiniteQuery(['relation', cacheKey], fetchRelations, {
    cacheTime: 0,
    enabled: relation.enabled,
    getNextPageParam(lastPage) {
      const isXToOneRelation = !lastPage?.pagination;

      if (
        !lastPage || // the API may send an empty 204 response
        isXToOneRelation || // xToOne relations do not have a pagination
        lastPage.pagination.page >= lastPage.pagination.pageCount
      ) {
        return undefined;
      }

      // eslint-disable-next-line consistent-return
      return lastPage.pagination.page + 1;
    },
    select: (data) => ({
      ...data,
      pages: data.pages.map((page) => {
        if (!page) {
          return page;
        }

        const { data, results, pagination } = page;
        const isXToOneRelation = !!data;
        let normalizedResults = [];

        // xToOne relations return an object, which we normalize so that relations
        // always have the same shape
        if (isXToOneRelation) {
          normalizedResults = [data];
        } else if (results) {
          normalizedResults = results.reverse();
        }

        return {
          pagination,
          results: normalizedResults,
        };
      }),
    }),
  });

  const { status, data } = relationsRes;

  useEffect(() => {
    if (status === 'success' && data && data.pages?.at(-1)?.results) {
      // everytime we fetch, we normalize prior to adding to redux
      const normalizedResults = normalizeRelations(data.pages?.at(-1)?.results, normalizeArguments);

      // this is loadRelation from EditViewDataManagerProvider
      onLoadRelationsCallback({
        target: { name, value: normalizedResults },
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, onLoadRelationsCallback, name]);

  const searchRes = useInfiniteQuery(
    ['relation', cacheKey, 'search', JSON.stringify(searchParams)],
    fetchSearch,
    {
      enabled: Object.keys(searchParams).length > 0,
      getNextPageParam(lastPage) {
        if (lastPage.pagination.page >= lastPage.pagination.pageCount) {
          return undefined;
        }

        // eslint-disable-next-line consistent-return
        return lastPage.pagination.page + 1;
      },
    }
  );

  const searchFor = (term, options = {}) => {
    setSearchParams({
      ...options,
      _q: term,
    });
  };

  return { relations: relationsRes, search: searchRes, searchFor };
};
