import * as Homepage from '../../../shared/contracts/homepage';

import { adminApi } from './api';

/**
 * TODO: Remove this service when the future flag for the widget api is removed
 */
const homepageService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['RecentDocumentList'],
  })
  .injectEndpoints({
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
    }),
  });

const { useGetRecentDocumentsQuery } = homepageService;

export { useGetRecentDocumentsQuery };
