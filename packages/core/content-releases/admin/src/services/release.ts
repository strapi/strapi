import { createApi } from '@reduxjs/toolkit/query/react';

import {
  CreateReleaseAction,
  CreateManyReleaseActions,
  DeleteReleaseAction,
} from '../../../shared/contracts/release-actions';
import { pluginId } from '../pluginId';

import { axiosBaseQuery } from './axios';

import type {
  GetReleaseActions,
  UpdateReleaseAction,
  ReleaseActionGroupBy,
} from '../../../shared/contracts/release-actions';
import type {
  CreateRelease,
  DeleteRelease,
  GetContentTypeEntryReleases,
  GetReleases,
  UpdateRelease,
  GetRelease,
  PublishRelease,
  MapEntriesToReleases,
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
  groupBy?: ReleaseActionGroupBy;
}

type GetReleasesTabResponse = GetReleases.Response & {
  meta: {
    activeTab: 'pending' | 'done';
  };
};

const releaseApi = createApi({
  reducerPath: pluginId,
  baseQuery: axiosBaseQuery,
  tagTypes: ['Release', 'ReleaseAction', 'EntriesInRelease'],
  endpoints: (build) => {
    return {
      getReleasesForEntry: build.query<
        GetContentTypeEntryReleases.Response,
        Partial<GetContentTypeEntryReleases.Request['query']>
      >({
        query(params) {
          return {
            url: '/content-releases',
            method: 'GET',
            config: {
              params,
            },
          };
        },
        providesTags: (result) =>
          result
            ? [
                ...result.data.map(({ id }) => ({ type: 'Release' as const, id })),
                { type: 'Release', id: 'LIST' },
              ]
            : [],
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
                page: page || 1,
                pageSize: pageSize || 16,
                filters: filters || {
                  releasedAt: {
                    $notNull: false,
                  },
                },
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
        providesTags: (result) =>
          result
            ? [
                ...result.data.map(({ id }) => ({ type: 'Release' as const, id })),
                { type: 'Release', id: 'LIST' },
              ]
            : [{ type: 'Release', id: 'LIST' }],
      }),
      getRelease: build.query<GetRelease.Response, GetRelease.Request['params']>({
        query({ id }) {
          return {
            url: `/content-releases/${id}`,
            method: 'GET',
          };
        },
        providesTags: (result, error, arg) => [{ type: 'Release' as const, id: arg.id }],
      }),
      getReleaseActions: build.query<
        GetReleaseActions.Response,
        GetReleaseActions.Request['params'] & GetReleaseActions.Request['query']
      >({
        query({ releaseId, ...params }) {
          return {
            url: `/content-releases/${releaseId}/actions`,
            method: 'GET',
            config: {
              params,
            },
          };
        },
        providesTags: [{ type: 'ReleaseAction', id: 'LIST' }],
      }),
      createRelease: build.mutation<CreateRelease.Response, CreateRelease.Request['body']>({
        query(data) {
          return {
            url: '/content-releases',
            method: 'POST',
            data,
          };
        },
        invalidatesTags: [{ type: 'Release', id: 'LIST' }],
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
        invalidatesTags: (result, error, arg) => [{ type: 'Release', id: arg.id }],
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
        invalidatesTags: [
          { type: 'Release', id: 'LIST' },
          { type: 'ReleaseAction', id: 'LIST' },
        ],
      }),
      createManyReleaseActions: build.mutation<
        CreateManyReleaseActions.Response,
        CreateManyReleaseActions.Request
      >({
        query({ body, params }) {
          return {
            url: `/content-releases/${params.releaseId}/actions/bulk`,
            method: 'POST',
            data: body,
          };
        },
        invalidatesTags: [
          { type: 'Release', id: 'LIST' },
          { type: 'ReleaseAction', id: 'LIST' },
          { type: 'EntriesInRelease' },
        ],
      }),
      updateReleaseAction: build.mutation<
        UpdateReleaseAction.Response,
        UpdateReleaseAction.Request & { query: GetReleaseActions.Request['query'] } & {
          actionPath: [string, number];
        }
      >({
        query({ body, params }) {
          return {
            url: `/content-releases/${params.releaseId}/actions/${params.actionId}`,
            method: 'PUT',
            data: body,
          };
        },
        invalidatesTags: () => [{ type: 'ReleaseAction', id: 'LIST' }],
        async onQueryStarted({ body, params, query, actionPath }, { dispatch, queryFulfilled }) {
          // We need to mimic the same params received by the getReleaseActions query
          const paramsWithoutActionId = {
            releaseId: params.releaseId,
            ...query,
          };

          const patchResult = dispatch(
            releaseApi.util.updateQueryData('getReleaseActions', paramsWithoutActionId, (draft) => {
              const [key, index] = actionPath;
              const action = draft.data[key][index];

              if (action) {
                action.type = body.type;
              }
            })
          );

          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        },
      }),
      deleteReleaseAction: build.mutation<
        DeleteReleaseAction.Response,
        DeleteReleaseAction.Request
      >({
        query({ params }) {
          return {
            url: `/content-releases/${params.releaseId}/actions/${params.actionId}`,
            method: 'DELETE',
          };
        },
        invalidatesTags: (result, error, arg) => [
          { type: 'Release', id: 'LIST' },
          { type: 'Release', id: arg.params.releaseId },
          { type: 'ReleaseAction', id: 'LIST' },
          { type: 'EntriesInRelease' },
        ],
      }),
      publishRelease: build.mutation<PublishRelease.Response, PublishRelease.Request['params']>({
        query({ id }) {
          return {
            url: `/content-releases/${id}/publish`,
            method: 'POST',
          };
        },
        invalidatesTags: (result, error, arg) => [{ type: 'Release', id: arg.id }],
      }),
      deleteRelease: build.mutation<DeleteRelease.Response, DeleteRelease.Request['params']>({
        query({ id }) {
          return {
            url: `/content-releases/${id}`,
            method: 'DELETE',
          };
        },
        invalidatesTags: () => [{ type: 'Release', id: 'LIST' }, { type: 'EntriesInRelease' }],
      }),
      getMappedEntriesInReleases: build.query<
        MapEntriesToReleases.Response['data'],
        MapEntriesToReleases.Request['query']
      >({
        query(params) {
          return {
            url: '/content-releases/mapEntriesToReleases',
            method: 'GET',
            config: {
              params,
            },
          };
        },
        transformResponse(response: MapEntriesToReleases.Response) {
          return response.data;
        },
        providesTags: [{ type: 'EntriesInRelease' }],
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
  useCreateManyReleaseActionsMutation,
  useUpdateReleaseMutation,
  useUpdateReleaseActionMutation,
  usePublishReleaseMutation,
  useDeleteReleaseActionMutation,
  useDeleteReleaseMutation,
  useGetMappedEntriesInReleasesQuery,
} = releaseApi;

export {
  useGetReleasesQuery,
  useGetReleasesForEntryQuery,
  useGetReleaseQuery,
  useGetReleaseActionsQuery,
  useCreateReleaseMutation,
  useCreateReleaseActionMutation,
  useCreateManyReleaseActionsMutation,
  useUpdateReleaseMutation,
  useUpdateReleaseActionMutation,
  usePublishReleaseMutation,
  useDeleteReleaseActionMutation,
  useDeleteReleaseMutation,
  useGetMappedEntriesInReleasesQuery,
  releaseApi,
};
