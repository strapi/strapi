import { uploadApi } from './api';

import type {
  GetFiles,
  File,
  Pagination,
  AssetWithPopulatedCreatedBy,
} from '../../../../shared/contracts/files';

interface GetAssetsParams {
  page?: number;
  pageSize?: number;
  folder?: number | null;
  sort?: string;
}

interface GetAssetsResponse {
  results: File[];
  pagination: Pagination;
}

const assetsApi = uploadApi.injectEndpoints({
  endpoints: (builder) => ({
    getAssets: builder.query<GetAssetsResponse, GetAssetsParams | void>({
      query: (params = {}) => {
        const { folder, ...rest } = params as GetAssetsParams;

        const queryParams: Record<string, unknown> = { ...rest };

        if (folder != null) {
          queryParams['filters'] = {
            $and: [{ folder: { id: folder } }],
          };
        } else {
          queryParams['filters'] = {
            $and: [{ folder: { id: { $null: true } } }],
          };
        }

        return {
          url: '/upload/files',
          method: 'GET',
          config: { params: queryParams },
        };
      },
      transformResponse: (response: GetFiles.Response['data']) => response,
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({ type: 'Asset' as const, id })),
              { type: 'Asset', id: 'LIST' },
            ]
          : [{ type: 'Asset', id: 'LIST' }],
    }),
    getAsset: builder.query<AssetWithPopulatedCreatedBy, number>({
      query: (id) => ({
        url: `/upload/files/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Asset' as const, id }],
    }),
  }),
});

export const { useGetAssetsQuery, useGetAssetQuery } = assetsApi;
