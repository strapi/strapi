import { i18nApi } from './api';

import type { GetAILocalizationJobsByDocument } from '../../../shared/contracts/ai-localization-jobs';

// Import the same constant used by the documents service for consistency
const SINGLE_TYPES = 'single-types';

const aiLocalizationJobsApi = i18nApi.injectEndpoints({
  endpoints: (builder) => ({
    getAILocalizationJobsByDocument: builder.query<
      GetAILocalizationJobsByDocument.Response,
      {
        documentId: string;
        model: string;
        collectionType: string;
      }
    >({
      query: ({ documentId, collectionType, model }) => ({
        url:
          collectionType === SINGLE_TYPES
            ? `/i18n/ai-localization-jobs/single-types/${model}`
            : `/i18n/ai-localization-jobs/collection-types/${model}/${documentId}`,
        method: 'GET',
      }),
      providesTags: (result, error, { documentId, model, collectionType }) => [
        {
          type: 'AILocalizationJobs',
          id: collectionType !== SINGLE_TYPES ? `${model}_${documentId}` : model,
        },
      ],
    }),
  }),
});

export const { useGetAILocalizationJobsByDocumentQuery } = aiLocalizationJobsApi;
