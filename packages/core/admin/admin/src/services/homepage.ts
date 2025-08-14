import * as Homepage from '../../../shared/contracts/homepage';

import { adminApi } from './api';

const homepageService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['CountDocuments'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getKeyStatistics: builder.query<Homepage.GetKeyStatistics.Response['data'], void>({
        query: () => '/admin/homepage/key-statistics',
        transformResponse: (response: Homepage.GetKeyStatistics.Response) => response.data,
        providesTags: (_, _err) => ['HomepageKeyStatistics'],
      }),
      getCountDocuments: builder.query<Homepage.GetCountDocuments.Response['data'], void>({
        query: () => '/content-manager/homepage/count-documents',
        transformResponse: (response: Homepage.GetCountDocuments.Response) => response.data,
        providesTags: (_, _err) => ['CountDocuments'],
      }),
    }),
  });

const { useGetKeyStatisticsQuery, useGetCountDocumentsQuery } = homepageService;

export { useGetKeyStatisticsQuery, useGetCountDocumentsQuery };
