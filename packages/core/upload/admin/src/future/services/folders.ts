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

export const { useCreateFolderMutation, useGetFoldersQuery, useGetFolderQuery } = foldersApi;
