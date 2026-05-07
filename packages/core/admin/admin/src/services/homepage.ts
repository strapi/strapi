import * as Homepage from '../../../shared/contracts/homepage';

import { adminApi } from './api';

const homepageService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['CountDocuments', 'HomepageLayout'],
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
      getHomepageLayout: builder.query<Homepage.GetHomepageLayout.Response['data'], void>({
        query: () => '/admin/homepage/layout',
        transformResponse: (r: Homepage.GetHomepageLayout.Response) => r.data,
        providesTags: ['HomepageLayout'],
      }),
      updateHomepageLayout: builder.mutation<
        Homepage.UpdateHomepageLayout.Response['data'],
        Homepage.UpdateHomepageLayout.Request['body']
      >({
        query: (body) => ({ url: '/admin/homepage/layout', method: 'PUT', data: body }),
        transformResponse: (r: Homepage.UpdateHomepageLayout.Response) => r.data,
        invalidatesTags: ['HomepageLayout'],
      }),
    }),
  });

const {
  useGetKeyStatisticsQuery,
  useGetCountDocumentsQuery,
  useGetHomepageLayoutQuery,
  useUpdateHomepageLayoutMutation,
} = homepageService;

export {
  useGetKeyStatisticsQuery,
  useGetCountDocumentsQuery,
  useGetHomepageLayoutQuery,
  useUpdateHomepageLayoutMutation,
};
