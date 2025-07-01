import * as Homepage from '../../../shared/contracts/homepage';

import { contentManagerApi } from './api';

const homepageService = contentManagerApi
  .enhanceEndpoints({
    addTagTypes: ['RecentDocumentList', 'CountDocuments'],
  })
  .injectEndpoints({
    /**
     * TODO: Remove overrideExisting when we remove the future flag
     * and delete the old homepage service in the admin
     */
    overrideExisting: true,
    endpoints: (builder) => ({
      getRecentDocuments: builder.query<
        Homepage.GetRecentDocuments.Response['data'],
        Homepage.GetRecentDocuments.Request['query']
      >({
        query: (params) => `/content-manager/homepage/recent-documents?action=${params.action}`,
        transformResponse: (response: Homepage.GetRecentDocuments.Response) => response.data,
        providesTags: (res, _err, { action }) => [
          { type: 'RecentDocumentList' as const, id: action },
        ],
      }),
      getCountDocuments: builder.query<Homepage.GetCountDocuments.Response['data'], void>({
        query: () => '/content-manager/homepage/count-documents',
        transformResponse: (response: Homepage.GetCountDocuments.Response) => response.data,
        providesTags: (_, _err) => ['CountDocuments'],
      }),
    }),
  });

const { useGetRecentDocumentsQuery, useGetCountDocumentsQuery } = homepageService;

export { useGetRecentDocumentsQuery, useGetCountDocumentsQuery };
