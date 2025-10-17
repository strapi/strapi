import { i18nApi } from './api';

import type { GetAILocalizationJobsByDocument } from '../../../shared/contracts/ai-localization-jobs';

const aiLocalizationJobsApi = i18nApi.injectEndpoints({
  endpoints: (builder) => ({
    getAILocalizationJobsByDocument: builder.query<
      GetAILocalizationJobsByDocument.Response,
      string
    >({
      query: (documentId) => ({
        url: `/i18n/ai-localization-jobs/document/${documentId}`,
        method: 'GET',
      }),
      providesTags: (result, error, documentId) => [
        { type: 'AILocalizationJobs', id: `document-${documentId}` },
      ],
    }),
  }),
});

export const { useGetAILocalizationJobsByDocumentQuery } = aiLocalizationJobsApi;
