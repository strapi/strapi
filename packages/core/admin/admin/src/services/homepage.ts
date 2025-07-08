import * as Homepage from '../../../shared/contracts/homepage';

import { adminApi } from './api';

const homepageService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['KeyStatistics'],
  })
  .injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
      getKeyStatistics: builder.query<Homepage.GetKeyStatistics.Response['data'], void>({
        query: () => '/admin/homepage/key-statistics',
        transformResponse: (response: Homepage.GetKeyStatistics.Response) => response.data,
        providesTags: (_, _err) => ['KeyStatistics'],
      }),
    }),
  });

const { useGetKeyStatisticsQuery } = homepageService;

export { useGetKeyStatisticsQuery };
