import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

import { contentManagerApi } from '../../services/api';

const historyVersionsApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getHistoryVersions: builder.query<
      Contracts.HistoryVersions.GetHistoryVersions.Response,
      Contracts.HistoryVersions.GetHistoryVersions.Request['query']
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
  }),
});

const { useGetHistoryVersionsQuery } = historyVersionsApi;

export { useGetHistoryVersionsQuery };
