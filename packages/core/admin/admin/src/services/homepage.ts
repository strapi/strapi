import * as Homepage from '../../../shared/contracts/homepage';

import { adminApi } from './api';

const homepageService = adminApi
  .enhanceEndpoints({
    // TODO: remove when the CM widgets are moved to the CM package, the type already exists there
    addTagTypes: ['RecentDocumentList'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getRecentDocuments: builder.query<
        Homepage.GetRecentDocuments.Response['data'],
        Homepage.GetRecentDocuments.Request['query']
      >({
        query: (params) => `/admin/homepage/recent-documents?action=${params.action}`,
        transformResponse: (response: Homepage.GetRecentDocuments.Response) => response.data,
        providesTags: (res, _err, { action }) => [
          { type: 'RecentDocumentList' as const, id: action },
        ],
      }),
    }),
  });

const { useGetRecentDocumentsQuery } = homepageService;

export { useGetRecentDocumentsQuery };
