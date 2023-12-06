import { createApi } from '@reduxjs/toolkit/query/react';

import { CreateReleaseAction } from '../../../shared/contracts/release-actions';
import { pluginId } from '../pluginId';

import { axiosBaseQuery } from './axios';

import type { GetReleaseActions } from '../../../shared/contracts/release-actions';
import type {
  CreateRelease,
  GetReleases,
  UpdateRelease,
  GetRelease,
} from '../../../shared/contracts/releases';

export interface GetReleasesQueryParams {
  page?: number;
  pageSize?: number;
  filters?: {
    releasedAt?: {
      // TODO: this should be a boolean, find a way to avoid strings
      $notNull?: boolean | 'true' | 'false';
    };
  };
}

export interface GetReleaseActionsQueryParams {
  page?: number;
  pageSize?: number;
}

type GetReleasesTabResponse = GetReleases.Response & {
  meta: {
    activeTab: 'pending' | 'done';
  };
};

const releaseApi = createApi({
  reducerPath: pluginId,
  baseQuery: axiosBaseQuery,
  tagTypes: ['Releases', 'Release', 'ReleaseActions', 'ReleasesForEntry'],
  endpoints: (build) => {
    return {
      /**
       * TODO: This will need to evolve to handle queries for:
       * - Get all releases where the entry is attached
       * - Get all releases where the entry is not attached
       *
       *  We need to explore the best way to filter on polymorphic relations in another PR
       */
      getReleasesForEntry: build.query<GetReleases.Response, GetReleasesQueryParams | void>({
        query() {
          return {
            url: '/content-releases',
            method: 'GET',
            config: {
              params: {
                filters: {
                  releasedAt: {
                    $notNull: false,
                  },
                },
              },
            },
          };
        },
        providesTags: ['ReleasesForEntry'],
      }),
      getReleases: build.query<GetReleasesTabResponse, GetReleasesQueryParams | void>({
        query(
          { page, pageSize, filters } = {
            page: 1,
            pageSize: 16,
            filters: {
              releasedAt: {
                $notNull: false,
              },
            },
          }
        ) {
          return {
            url: '/content-releases',
            method: 'GET',
            config: {
              params: {
                page,
                pageSize,
                filters,
              },
            },
          };
        },
        transformResponse(response: GetReleasesTabResponse, meta, arg) {
          const releasedAtValue = arg?.filters?.releasedAt?.$notNull;
          const isActiveDoneTab = releasedAtValue === 'true';
          const newResponse: GetReleasesTabResponse = {
            ...response,
            meta: {
              ...response.meta,
              activeTab: isActiveDoneTab ? 'done' : 'pending',
            },
          };

          return newResponse;
        },
        providesTags: ['Releases'],
      }),
      getRelease: build.query<GetRelease.Response, GetRelease.Request['params']>({
        query({ id }) {
          return {
            url: `/content-releases/${id}`,
            method: 'GET',
          };
        },
        providesTags: ['Release'],
      }),
      getReleaseActions: build.query<
        GetReleaseActions.Response,
        GetReleaseActions.Request['params'] & GetReleaseActions.Request['query']
      >({
        query({ releaseId, page, pageSize }) {
          return {
            url: `/content-releases/${releaseId}/actions`,
            method: 'GET',
            config: {
              params: {
                page,
                pageSize,
              },
            },
          };
        },
        providesTags: ['ReleaseActions'],
      }),
      createRelease: build.mutation<CreateRelease.Response, CreateRelease.Request['body']>({
        query(data) {
          return {
            url: '/content-releases',
            method: 'POST',
            data,
          };
        },
        invalidatesTags: ['Releases', 'Release'],
      }),
      updateRelease: build.mutation<
        void,
        UpdateRelease.Request['params'] & UpdateRelease.Request['body']
      >({
        query({ id, ...data }) {
          return {
            url: `/content-releases/${id}`,
            method: 'PUT',
            data,
          };
        },
        invalidatesTags: ['Releases', 'Release'],
      }),
      createReleaseAction: build.mutation<
        CreateReleaseAction.Response,
        CreateReleaseAction.Request
      >({
        query({ body, params }) {
          return {
            url: `/content-releases/${params.releaseId}/actions`,
            method: 'POST',
            data: body,
          };
        },
        invalidatesTags: ['ReleaseActions', 'Release', 'Releases'],
      }),
    };
  },
});

const {
  useGetReleasesQuery,
  useGetReleasesForEntryQuery,
  useGetReleaseQuery,
  useGetReleaseActionsQuery,
  useCreateReleaseMutation,
  useCreateReleaseActionMutation,
  useUpdateReleaseMutation,
} = releaseApi;

export {
  useGetReleasesQuery,
  useGetReleasesForEntryQuery,
  useGetReleaseQuery,
  useGetReleaseActionsQuery,
  useCreateReleaseMutation,
  useCreateReleaseActionMutation,
  useUpdateReleaseMutation,
  releaseApi,
};
