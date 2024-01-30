import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

import { contentManagerApi } from './api';

import type { EntityService } from '@strapi/types';
import type { errors } from '@strapi/utils';

type GetRelationsResponse =
  | {
      results: Contracts.Relations.RelationResult[];
      pagination: {
        page: NonNullable<EntityService.Params.Pagination.PageNotation['page']>;
        pageSize: NonNullable<EntityService.Params.Pagination.PageNotation['pageSize']>;
        pageCount: number;
        total: number;
      } | null;
      error?: never;
    }
  | {
      results?: never;
      pagination?: never;
      error: errors.ApplicationError | errors.YupValidationError;
    };

const relationsApi = contentManagerApi.injectEndpoints({
  endpoints: (build) => ({
    getRelations: build.query<
      GetRelationsResponse,
      Contracts.Relations.FindExisting.Params & {
        pagination?: Contracts.Relations.FindExisting.Request['query'];
      }
    >({
      query: ({ model, id, targetField, pagination }) => {
        return {
          url: `/content-manager/relations/${model}/${id}/${targetField}`,
          method: 'GET',
          config: {
            params: pagination,
          },
        };
      },
      serializeQueryArgs: (args) => {
        const { endpointName, queryArgs } = args;
        return {
          endpointName,
          model: queryArgs.model,
          id: queryArgs.id,
          targetField: queryArgs.targetField,
        };
      },
      merge: (currentCache, newItems) => {
        if (currentCache.results && newItems.results) {
          /**
           * Relations will always have unique IDs, so we can therefore assume
           * that we only need to push the new items to the cache.
           */
          const existingIds = currentCache.results.map((item) => item.id);
          const uniqueNewItems = newItems.results.filter((item) => !existingIds.includes(item.id));
          currentCache.results.push(...uniqueNewItems);
          currentCache.pagination = newItems.pagination;
        }
      },
      forceRefetch({ currentArg, previousArg }) {
        if (!currentArg?.pagination && !previousArg?.pagination) {
          return false;
        }

        return (
          currentArg?.pagination?.page !== previousArg?.pagination?.page ||
          currentArg?.pagination?.pageSize !== previousArg?.pagination?.pageSize
        );
      },
      transformResponse: (response: Contracts.Relations.FindExisting.Response) => {
        if ('data' in response) {
          return { results: response.data ? [response.data] : [], pagination: null };
        } else if ('results' in response) {
          return {
            ...response,
            results: response.results.reverse(),
          };
        } else {
          return response;
        }
      },
    }),
    searchRelations: build.query<
      Contracts.Relations.FindAvailable.Response,
      Contracts.Relations.FindAvailable.Params & {
        params?: Contracts.Relations.FindAvailable.Request['query'];
      }
    >({
      query: ({ model, targetField, params }) => {
        return {
          url: `/content-manager/relations/${model}/${targetField}`,
          method: 'GET',
          config: {
            params: params,
          },
        };
      },
      serializeQueryArgs: (args) => {
        const { endpointName, queryArgs } = args;
        return {
          endpointName,
          model: queryArgs.model,
          targetField: queryArgs.targetField,
          _q: queryArgs.params?._q,
        };
      },
      merge: (currentCache, newItems) => {
        if (currentCache.results && newItems.results) {
          /**
           * Relations will always have unique IDs, so we can therefore assume
           * that we only need to push the new items to the cache.
           */
          const existingIds = currentCache.results.map((item) => item.id);
          const uniqueNewItems = newItems.results.filter((item) => !existingIds.includes(item.id));
          currentCache.results.push(...uniqueNewItems);
          currentCache.pagination = newItems.pagination;
        }
      },
      forceRefetch({ currentArg, previousArg }) {
        if (!currentArg?.params && !previousArg?.params) {
          return false;
        }

        return (
          currentArg?.params?.page !== previousArg?.params?.page ||
          currentArg?.params?.pageSize !== previousArg?.params?.pageSize
        );
      },
      transformResponse: (response: Contracts.Relations.FindAvailable.Response) => {
        if (response.results) {
          return {
            ...response,
            results: response.results.reverse(),
          };
        } else {
          return response;
        }
      },
    }),
  }),
});

const { useGetRelationsQuery, useLazySearchRelationsQuery } = relationsApi;

export { useGetRelationsQuery, useLazySearchRelationsQuery };
