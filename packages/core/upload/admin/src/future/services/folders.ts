import { uploadApi } from './api';

import type {
  Folder,
  CreateFolders,
  GetFolder,
  GetFolders,
} from '../../../../shared/contracts/folders';

export type FolderWithCounts = Omit<Folder, 'children' | 'files'> & {
  children?: { count: number };
  files?: { count: number };
};

interface GetFoldersParams {
  parentId?: number | null;
}

const foldersApi = uploadApi.injectEndpoints({
  endpoints: (builder) => ({
    getFolders: builder.query<Folder[], GetFoldersParams | void>({
      query: (params = {}) => {
        const { parentId } = params as GetFoldersParams;

        const queryParams: Record<string, unknown> = {};

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
        // TODO dont want this cast
        (response as any).data,
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
      invalidatesTags: [{ type: 'Folder', id: 'LIST' }],
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
        ((response as any)?.data ?? response ?? []) as Folder[],
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
  }),
});

export const {
  useCreateFolderMutation,
  useGetFoldersQuery,
  useGetFolderQuery,
  useGetAllFoldersQuery,
} = foldersApi;
