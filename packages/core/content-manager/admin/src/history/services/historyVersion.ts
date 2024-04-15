import {
  GetHistoryVersions,
  RestoreHistoryVersion,
} from '../../../../shared/contracts/history-versions';
import { contentManagerApi } from '../../services/api';

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
    restoreVersion: builder.mutation<RestoreHistoryVersion.Response, RestoreHistoryVersion.Request>(
      {
        query({ params, body }) {
          return {
            url: `/content-manager/history-versions/${params.versionId}/restore`,
            method: 'PUT',
            data: body,
          };
        },
        invalidatesTags: (_res, _error, { params }) => {
          return [
            'HistoryVersion',
            { type: 'Document', id: `${params.contentType}_${params.documentId}` },
          ];
        },
      }
    ),
  }),
});

const { useGetHistoryVersionsQuery, useRestoreVersionMutation } = historyVersionsApi;

export { useGetHistoryVersionsQuery, useRestoreVersionMutation };
