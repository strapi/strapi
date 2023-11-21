import { createApi } from '@reduxjs/toolkit/query/react';

import { pluginId } from '../pluginId';
import { axiosBaseQuery } from '../utils/data';

import type {
  CreateRelease,
  GetReleases,
  ReleaseDataResponse,
} from '../../../shared/contracts/releases';

const releaseApi = createApi({
  reducerPath: pluginId,
  baseQuery: axiosBaseQuery,
  tagTypes: ['Releases'],
  endpoints: (build) => {
    return {
      getRelease: build.query<GetReleases.Response, undefined>({
        query() {
          return {
            url: '/content-releases',
            method: 'GET',
          };
        },
        providesTags: ['Releases'],
      }),
      createRelease: build.mutation<{ data: ReleaseDataResponse }, CreateRelease.Request['body']>({
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

const { useGetReleaseQuery, useCreateReleaseMutation } = releaseApi;

export { useGetReleaseQuery, useCreateReleaseMutation, releaseApi };
