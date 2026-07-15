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

interface ReplaceAssetArgs {
  id: number;
  // `File` is shadowed in this module by the asset-file contract type; the
  // global browser File is what we need for FormData.
  file: globalThis.File;
  fileInfo?: Partial<UploadFileInfo>;
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
     * Replace the binary content of an existing asset.
     * Hits `POST /upload?id=<id>` with a multipart body — the controller
     * dispatches to `admin-upload.replaceFile` when a `files` part is present.
     * Uses the standard axios baseQuery (no streaming) since we only ever
     * replace one file at a time and don't need per-byte progress here.
     */
    replaceAsset: builder.mutation<AssetWithPopulatedCreatedBy, ReplaceAssetArgs>({
      query: ({ id, file, fileInfo }) => {
        const formData = new FormData();
        formData.append('files', file);
        if (fileInfo) {
          formData.append('fileInfo', JSON.stringify(fileInfo));
        }
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
    /**
     * Permanently delete several assets and/or folders in one request. Same
     * endpoint as the legacy bulk remove (`POST /upload/actions/bulk-delete`,
     * handled by `admin-folder-file.deleteMany`) so server behaviour is
     * unchanged — folder deletion cascades to everything inside.
     */
    bulkDeleteItems: builder.mutation<unknown, { fileIds: number[]; folderIds: number[] }>({
      query: ({ fileIds, folderIds }) => ({
        url: '/upload/actions/bulk-delete',
        method: 'POST',
        data: { fileIds, folderIds },
      }),
      invalidatesTags: [
        { type: 'Asset' as const, id: 'LIST' },
        { type: 'Folder' as const, id: 'LIST' },
        // The sidebar FolderTree reads /upload/folder-structure, which carries
        // its own tag — without it, deleted folders linger in the tree.
        { type: 'Folder' as const, id: 'STRUCTURE' },
      ],
    }),
  }),
});

export const {
  useGetAssetsQuery,
  useGetAssetQuery,
  useUpdateAssetMutation,
  useReplaceAssetMutation,
  useDeleteAssetMutation,
  useBulkDeleteItemsMutation,
} = assetsApi;
