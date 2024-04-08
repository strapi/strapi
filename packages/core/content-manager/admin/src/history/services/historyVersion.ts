import { GetHistoryVersions } from '../../../../shared/contracts/history-versions';
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
            options: {
              params,
            },
          },
        };
      },
      providesTags: ['HistoryVersion'],
    }),
  }),
});

const { useGetHistoryVersionsQuery } = historyVersionsApi;

export { useGetHistoryVersionsQuery };
