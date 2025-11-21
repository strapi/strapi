import { contentManagerApi } from '@content-manager/admin/services/api';
import type { GetInitData } from '@content-manager/shared/contracts/init';

const initApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getInitialData: builder.query<GetInitData.Response['data'], void>({
      query: () => '/content-manager/init',
      transformResponse: (response: GetInitData.Response) => response.data,
      providesTags: ['InitialData'],
    }),
  }),
});

const { useGetInitialDataQuery } = initApi;

export { useGetInitialDataQuery };
