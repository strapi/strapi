import { useEffect, useState } from 'react';

import { useCallbackRef, useFetchClient } from '@strapi/helper-plugin';
import { useInfiniteQuery } from 'react-query';

import {
  NormalizeRelationArgs,
  NormalizedRelation,
  normalizeRelations,
} from './utils/normalizeRelations';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

interface UseRelationArgs {
  relation: {
    enabled: boolean;
    endpoint: string;
    normalizeArguments: NormalizeRelationArgs;
    onLoad: (data: NormalizedRelation[]) => void;
    pageParams?: Record<string, any>;
    pageGoal?: number;
  };
  search: {
    endpoint: string;
    pageParams?: Record<string, any>;
  };
}

const useRelation = (cacheKey: any[] = [], { relation, search }: UseRelationArgs) => {
  const [searchParams, setSearchParams] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const { get } = useFetchClient();

  const { onLoad: onLoadRelations, normalizeArguments } = relation;

  const relationsRes = useInfiniteQuery(
    ['relation', ...cacheKey],
    async ({ pageParam = 1 }) => {
      try {
        const { data } = await get<Contracts.Relations.FindExisting.Response>(relation?.endpoint, {
          params: {
            ...(relation.pageParams ?? {}),
            page: pageParam,
          },
        });

        setCurrentPage(pageParam);

        return data;
      } catch (err) {
        return null;
      }
    },
    {
      cacheTime: 0,
      enabled: relation.enabled,
      getNextPageParam(lastPage) {
        const isXToOneRelation = lastPage && !('pagination' in lastPage);

        if (
          !lastPage || // the API may send an empty 204 response
          isXToOneRelation || // xToOne relations do not have a pagination
          lastPage?.pagination.page >= lastPage?.pagination.pageCount
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

          let normalizedResults: Contracts.Relations.RelationResult[] = [];

          // xToOne relations return an object, which we normalize so that relations
          // always have the same shape
          if ('data' in page && page.data) {
            normalizedResults = [page.data];
          } else if ('results' in page && page.results) {
            normalizedResults = [...page.results].reverse();
          }

          return {
            pagination: 'pagination' in page ? page.pagination : undefined,
            results: normalizedResults,
          };
        }),
      }),
    }
  );

  const { pageGoal } = relation;

  const { status, data, fetchNextPage, hasNextPage } = relationsRes;

  useEffect(() => {
    /**
     * This ensures the infiniteQuery hook fetching has caught-up with the modifiedData
     * state i.e. in circumstances where you add 10 relations, the browserState knows this,
     * but the hook would think it could fetch more, when in reality, it can't.
     */
    if (pageGoal && pageGoal > currentPage && hasNextPage && status === 'success') {
      fetchNextPage({
        pageParam: currentPage + 1,
      });
    }
  }, [pageGoal, currentPage, fetchNextPage, hasNextPage, status]);

  const onLoadRelationsCallback = useCallbackRef(onLoadRelations);

  useEffect(() => {
    if (status === 'success' && data && data.pages?.at(-1)?.results && onLoadRelationsCallback) {
      // everytime we fetch, we normalize prior to adding to redux
      const normalizedResults = normalizeRelations(
        data.pages.at(-1)?.results ?? [],
        normalizeArguments
      );

      // this is loadRelation from EditViewDataManagerProvider
      onLoadRelationsCallback(normalizedResults);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, onLoadRelationsCallback, data]);

  const searchRes = useInfiniteQuery(
    ['relation', ...cacheKey, 'search', JSON.stringify(searchParams)],
    async ({ pageParam = 1 }) => {
      try {
        const { data } = await get<Contracts.Relations.FindAvailable.Response>(search.endpoint, {
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
    },
    {
      enabled: Object.keys(searchParams).length > 0,
      getNextPageParam(lastPage) {
        if (
          !lastPage?.pagination ||
          (lastPage.pagination && lastPage.pagination.page >= lastPage.pagination.pageCount)
        ) {
          return undefined;
        }

        // eslint-disable-next-line consistent-return
        return lastPage.pagination.page + 1;
      },
    }
  );

  const searchFor = (term: string, options: object = {}) => {
    setSearchParams({
      ...options,
      _q: term,
      _filter: '$containsi',
    });
  };

  return { relations: relationsRes, search: searchRes, searchFor };
};

export { useRelation };
export type { UseRelationArgs };
