import { Data } from '@strapi/types';

import {
  GetHistoryVersions,
  RestoreHistoryVersion,
} from '../../../../shared/contracts/history-versions';
import { COLLECTION_TYPES } from '../../constants/collections';
import { contentManagerApi } from '../../services/api';

interface RestoreVersion extends RestoreHistoryVersion.Request {
  documentId: Data.ID;
  collectionType?: string;
}

const historyVersionsApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getHistoryVersions: builder.query<
      GetHistoryVersions.Response,
      GetHistoryVersions.Request['query']
    >({
      query(params) {
        return {
          url: `/content-manager/history-versions`,
          method: 'GET',
          config: {
            params,
          },
        };
      },
      providesTags: ['HistoryVersion'],
    }),
    restoreVersion: builder.mutation<RestoreHistoryVersion.Response, RestoreVersion>({
      query({ params, body }) {
        return {
          url: `/content-manager/history-versions/${params.versionId}/restore`,
          method: 'PUT',
          data: body,
        };
      },
      invalidatesTags: (_res, _error, { documentId, collectionType, params }) => {
        return [
          'HistoryVersion',
          {
            type: 'Document',
            id:
              collectionType === COLLECTION_TYPES
                ? `${params.contentType}_${documentId}`
                : params.contentType,
          },
        ];
      },
    }),
  }),
});

const { useGetHistoryVersionsQuery, useRestoreVersionMutation } = historyVersionsApi;

export { useGetHistoryVersionsQuery, useRestoreVersionMutation };
