import { contentManagerApi } from './api';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const initApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getInitialData: builder.query<Contracts.Init.GetInitData.Response['data'], void>({
      query: () => '/content-manager/init',
      transformResponse: (response: Contracts.Init.GetInitData.Response) => response.data,
      providesTags: ['InitialData'],
    }),
  }),
});

const { useGetInitialDataQuery } = initApi;

export { useGetInitialDataQuery };
