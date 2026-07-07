import { uploadApi } from './api';

import type {
  Folder,
  FolderNode,
  CreateFolders,
  GetFolder,
  GetFolders,
  GetFolderStructure,
  BulkMoveFolders,
} from '../../../../shared/contracts/folders';

export type FolderWithCounts = Omit<Folder, 'children' | 'files'> & {
  children?: { count: number };
  files?: { count: number };
};

interface GetFoldersParams {
  parentId?: number | null;
}

interface BulkMoveParams {
  fileIds?: number[];
  folderIds?: number[];
  destinationFolderId: number;
}

type DataEnvelope<T> = {
  data: T;
};

const isDataEnvelope = <T>(response: T | DataEnvelope<T>): response is DataEnvelope<T> =>
  typeof response === 'object' && response !== null && 'data' in response;

const unwrapData = <T>(response: T | DataEnvelope<T>): T =>
  isDataEnvelope(response) ? response.data : response;

const foldersApi = uploadApi.injectEndpoints({
  endpoints: (builder) => ({
    getFolders: builder.query<Folder[], GetFoldersParams | void>({
      query: (params = {}) => {
        const { parentId } = params as GetFoldersParams;

        const queryParams: Record<string, unknown> = {
          // Match sidebar FolderTree order (server getStructure uses sortBy('name')).
          sort: 'name:ASC',
        };

        if (parentId != null) {
          queryParams['filters'] = {
            $and: [{ parent: { id: parentId } }],
          };
        } else {
          queryParams['filters'] = {
            $and: [{ parent: { id: { $null: true } } }],
          };
        }

        return {
          url: '/upload/folders',
          method: 'GET',
          config: { params: queryParams },
        };
      },
      transformResponse: (response: GetFolders.Response['data']) =>
        unwrapData<GetFolders.Response['data']>(response),
      providesTags: (results) => {
        if (results) {
          return [
            ...results.map(({ id }) => ({ type: 'Folder' as const, id })),
            { type: 'Folder', id: 'LIST' },
          ];
        }
        return [{ type: 'Folder', id: 'LIST' }];
      },
    }),
    createFolder: builder.mutation<CreateFolders.Response['data'], CreateFolders.Request['body']>({
      query: (body) => ({
        url: '/upload/folders',
        method: 'POST',
        data: body,
      }),
      transformResponse: (response: CreateFolders.Response) => response.data,
      invalidatesTags: [
        { type: 'Folder', id: 'LIST' },
        { type: 'Folder', id: 'STRUCTURE' },
      ],
    }),
    /**
     * Hierarchical folder tree used by the FolderTree sidebar. Returned as a
     * single nested array — the server walks the folders table once and
     * assembles parent/child relationships.
     *
     * TODO: filter results like `admin-folder.find` for folder-scoped roles
     * (v1 returns all folders; relies on global `plugin::upload.read`).
     */
    getFolderStructure: builder.query<FolderNode[], void>({
      query: () => ({
        url: '/upload/folder-structure',
        method: 'GET',
      }),
      // TODO: align GetFolderStructure contract with the real /upload/folder-structure
      // envelope and drop this defensive unwrap (data[] vs { data: [] }).
      transformResponse: (response: GetFolderStructure.Response['data']) =>
        ((response as unknown as { data: FolderNode[] })?.data ??
          (response as unknown as FolderNode[]) ??
          []) as FolderNode[],
      providesTags: [{ type: 'Folder', id: 'STRUCTURE' }],
    }),
    /**
     * Flat list of every folder, used to populate the "Location" select in the
     * asset details drawer. No parent filter — we want the entire tree in one
     * query so the select can render any destination folder.
     */
    getAllFolders: builder.query<Folder[], void>({
      query: () => ({
        url: '/upload/folders',
        method: 'GET',
      }),
      transformResponse: (response: GetFolders.Response['data']) =>
        unwrapData<GetFolders.Response['data']>(response ?? []),
      providesTags: (results) => {
        if (results) {
          return [
            ...results.map(({ id }) => ({ type: 'Folder' as const, id })),
            { type: 'Folder' as const, id: 'LIST' },
          ];
        }
        return [{ type: 'Folder' as const, id: 'LIST' }];
      },
    }),
    getFolder: builder.query<FolderWithCounts, { id: number }>({
      query: ({ id }) => ({
        url: `/upload/folders/${id}`,
        method: 'GET',
        config: {
          params: {
            populate: {
              parent: {
                populate: {
                  parent: '*',
                },
              },
              children: { count: true },
              files: { count: true },
            },
          },
        },
      }),
      transformResponse: (response: GetFolder.Response) =>
        response.data as unknown as FolderWithCounts,
      providesTags: (_result, _error, { id }) => [{ type: 'Folder', id }],
    }),
    bulkMove: builder.mutation<BulkMoveFolders.Response['data'], BulkMoveParams>({
      query: ({ fileIds = [], folderIds = [], destinationFolderId }) => ({
        url: '/upload/actions/bulk-move',
        method: 'POST',
        data: { fileIds, folderIds, destinationFolderId },
      }),
      transformResponse: (response: BulkMoveFolders.Response) => response.data,
      invalidatesTags: [
        { type: 'Asset', id: 'LIST' },
        { type: 'Folder', id: 'LIST' },
        { type: 'Folder', id: 'STRUCTURE' },
      ],
    }),
  }),
});

export const {
  useCreateFolderMutation,
  useGetFoldersQuery,
  useGetFolderQuery,
  useGetAllFoldersQuery,
  useGetFolderStructureQuery,
  useBulkMoveMutation,
} = foldersApi;
