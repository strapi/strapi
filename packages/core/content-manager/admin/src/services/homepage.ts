import * as Homepage from '../../../shared/contracts/homepage';

import { contentManagerApi } from './api';

const homepageService = contentManagerApi
  .enhanceEndpoints({
    addTagTypes: ['RecentDocumentList'],
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
    }),
  });

const { useGetRecentDocumentsQuery } = homepageService;

export { useGetRecentDocumentsQuery };
