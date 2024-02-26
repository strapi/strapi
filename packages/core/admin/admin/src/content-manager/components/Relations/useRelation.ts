import { useEffect, useCallback, useState } from 'react';

import { useCallbackRef } from '@strapi/helper-plugin';

import { useGetRelationsQuery, useLazySearchRelationsQuery } from '../../services/relations';

import {
  NormalizeRelationArgs,
  NormalizedRelation,
  normalizeRelations,
} from './utils/normalizeRelations';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

interface UseRelationArgs {
  relation: {
    skip: boolean;
    params: Contracts.Relations.FindExisting.Params | null;
    normalizeArguments: NormalizeRelationArgs;
    onLoad: (data: NormalizedRelation[]) => void;
    pageGoal?: number;
    pageParams?: Record<string, any>;
  };
  search: {
    searchParams: Contracts.Relations.FindAvailable.Params;
    pageParams?: Record<string, any>;
  };
}

/**
 * TODO: we can probably refactor this to be leaner.
 */
const useRelation = ({ relation, search }: UseRelationArgs) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { onLoad: onLoadRelations, normalizeArguments } = relation;

  const relationsRes = useGetRelationsQuery(
    {
      model: relation.params?.model ?? '',
      targetField: relation.params?.targetField ?? '',
      id: relation.params?.id ?? '',
      pagination: {
        ...relation.pageParams,
        page: currentPage,
      },
    },
    {
      skip: relation.skip,
    }
  );

  const { pageGoal } = relation;

  const { status, data } = relationsRes;
  const fetchNextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const hasNextPage = data?.pagination ? data.pagination.page < data?.pagination.pageCount : false;

  useEffect(() => {
    /**
     * This ensures the infiniteQuery hook fetching has caught-up with the modifiedData
     * state i.e. in circumstances where you add 10 relations, the browserState knows this,
     * but the hook would think it could fetch more, when in reality, it can't.
     */
    if (pageGoal && pageGoal > currentPage && hasNextPage && status === 'fulfilled') {
      setCurrentPage(currentPage + 1);
    }
  }, [pageGoal, currentPage, fetchNextPage, hasNextPage, status]);

  const onLoadRelationsCallback = useCallbackRef(onLoadRelations);

  useEffect(() => {
    if (status === 'fulfilled' && data && data.results && onLoadRelationsCallback) {
      // everytime we fetch, we normalize prior to adding to redux
      const normalizedResults = normalizeRelations(data.results ?? [], normalizeArguments);

      // this is loadRelation from EditViewDataManagerProvider
      onLoadRelationsCallback(normalizedResults);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, onLoadRelationsCallback, data]);

  const [searchForTrigger, searchRes] = useLazySearchRelationsQuery();

  const [searchQueryParams, setSearchQueryParams] = useState<
    | (Contracts.Relations.FindAvailable.Params & {
        params: Contracts.Relations.FindAvailable.Request['query'];
      })
    | null
  >(null);

  useEffect(() => {
    if (!searchQueryParams) return;

    searchForTrigger(searchQueryParams);
  }, [searchForTrigger, searchQueryParams]);

  const searchFor = (term: string, options: object = {}) => {
    setSearchQueryParams({
      ...search.searchParams,
      params: {
        ...options,
        id: relation.params?.id ?? '',
        _q: term,
        _filter: '$containsi',
      },
    });
  };

  return {
    relations: {
      ...relationsRes,
      fetchNextPage,
      hasNextPage,
    },
    search: {
      data: searchRes.data,
      isLoading: searchRes.isLoading,
      hasNextPage: searchRes.data?.pagination
        ? searchRes.data?.pagination.page < searchRes.data?.pagination.pageCount
        : false,
      fetchNextPage: () => {
        setSearchQueryParams((s) => {
          const page = s?.params.page ?? Math.floor((searchRes.data?.results?.length ?? 1) / 10);
          return {
            ...(s ?? search.searchParams),
            params: {
              ...s?.params,
              page: page + 1,
            },
          };
        });
      },
    },
    searchFor,
  };
};

export { useRelation };
export type { UseRelationArgs };
