import { uploadApi } from './api';

import type {
  GetFiles,
  File,
  Pagination,
  UploadFileInfo,
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

interface UpdateAssetArgs {
  id: number;
  fileInfo: Partial<UploadFileInfo>;
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
    /**
     * Update the editable metadata of an existing asset.
     * Hits the legacy `POST /upload?id=<id>` endpoint which dispatches to
     * `admin-upload.updateFileInfo`.
     */
    updateAsset: builder.mutation<AssetWithPopulatedCreatedBy, UpdateAssetArgs>({
      query: ({ id, fileInfo }) => {
        const formData = new FormData();
        formData.append('fileInfo', JSON.stringify(fileInfo));

        return {
          url: '/upload',
          method: 'POST',
          data: formData,
          config: { params: { id } },
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Asset' as const, id },
        { type: 'Asset' as const, id: 'LIST' },
      ],
    }),
    /**
     * Permanently delete an asset by id. Hits the same endpoint as the legacy
     * `useRemoveAsset` hook so server behaviour is unchanged.
     */
    deleteAsset: builder.mutation<unknown, number>({
      query: (id) => ({
        url: `/upload/files/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Asset' as const, id },
        { type: 'Asset' as const, id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAssetsQuery,
  useGetAssetQuery,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} = assetsApi;
