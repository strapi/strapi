import { createApi } from '@reduxjs/toolkit/query/react';

import { pluginId } from '../pluginId';

import { axiosBaseQuery } from './axios';

import type { CreateRelease, GetReleases } from '../../../shared/contracts/releases';

export interface GetAllReleasesQueryParams {
  page?: number;
  pageSize?: number;
  filters?: {
    releasedAt?: {
      // TODO: this should be a boolean, find a way to avoid strings
      $notNull?: boolean | 'true' | 'false';
    };
  };
}

const releaseApi = createApi({
  reducerPath: pluginId,
  baseQuery: axiosBaseQuery,
  tagTypes: ['Releases'],
  endpoints: (build) => {
    return {
      getReleases: build.query<GetReleases.Response, GetAllReleasesQueryParams | void>({
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
        transformResponse(response: GetReleases.Response, meta, arg) {
          const releasedAtValue = arg?.filters?.releasedAt?.$notNull;
          const isActiveDoneTab = releasedAtValue === 'true';
          const newResponse = {
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
      createRelease: build.mutation<CreateRelease.Response, CreateRelease.Request['body']>({
        query(data) {
          return {
            url: '/content-releases',
            method: 'POST',
            data,
          };
        },
        invalidatesTags: ['Releases'],
      }),
    };
  },
});

const { useGetReleasesQuery, useCreateReleaseMutation } = releaseApi;

export { useGetReleasesQuery, useCreateReleaseMutation, releaseApi };
