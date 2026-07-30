import { spacesApi } from './api';

export interface SpaceCapabilities {
  apiTokens: boolean;
  transferTokens: boolean;
  webhooks: boolean;
  users: boolean;
  roles: boolean;
  internationalization: boolean;
  mediaLibrarySettings: boolean;
  publish: boolean;
  moveEntries: boolean;
  upload: boolean;
  contentApi: boolean;
}

export const DEFAULT_CAPABILITIES: SpaceCapabilities = {
  apiTokens: true,
  transferTokens: true,
  webhooks: true,
  users: true,
  roles: true,
  internationalization: true,
  mediaLibrarySettings: true,
  publish: true,
  moveEntries: true,
  upload: true,
  contentApi: true,
};

export interface AvailableSpace {
  id: number;
  slug: string;
  name: string;
  color: string | null;
  capabilities?: SpaceCapabilities;
}

export interface ManagedSpace extends AvailableSpace {
  status: 'active' | 'archived';
}

interface CreateSpaceRequest {
  name: string;
  slug?: string;
  color?: string | null;
}

interface CreateSpaceRequestWithCapabilities extends CreateSpaceRequest {
  capabilities?: SpaceCapabilities;
}

interface UpdateSpaceRequest {
  id: number;
  name?: string;
  slug?: string;
  color?: string | null;
  status?: ManagedSpace['status'];
  capabilities?: SpaceCapabilities;
}

interface MoveToSpaceRequest {
  uid: string;
  documentIds: string[];
  targetSpaceSlug: string;
}

interface MoveToSpaceResponse {
  movedCount: number;
  targetSpaceId: number;
  documentIds: string[];
}

const endpoints = spacesApi.injectEndpoints({
  endpoints: (builder) => ({
    getMineSpaces: builder.query<AvailableSpace[], { contentType?: string } | void>({
      query: (arg) => {
        const params = arg?.contentType
          ? `?contentType=${encodeURIComponent(arg.contentType)}`
          : '';
        return `/spaces/mine${params}`;
      },
      providesTags: (_res, _err, arg) => [
        { type: 'Space', id: arg?.contentType ? `LIST-${arg.contentType}` : 'LIST' },
      ],
    }),
    getAllSpaces: builder.query<ManagedSpace[], void>({
      query: () => '/spaces/all',
      providesTags: [{ type: 'Space', id: 'ALL' }],
    }),
    updateSpace: builder.mutation<ManagedSpace, UpdateSpaceRequest>({
      query: ({ id, ...body }) => ({
        url: `/spaces/${id}`,
        method: 'PUT',
        data: body,
      }),
      // Whole-type invalidation: the switcher list, the settings list and any
      // per-content-type eligibility lists all reflect renames/archives.
      invalidatesTags: ['Space'],
    }),
    deleteSpace: builder.mutation<{ id: number; slug: string }, number>({
      query: (id) => ({
        url: `/spaces/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Space'],
    }),
    createSpace: builder.mutation<AvailableSpace, CreateSpaceRequestWithCapabilities>({
      query: (body) => ({
        url: '/spaces',
        method: 'POST',
        data: body,
      }),
      // Invalidate every Space tag (plain type entry) so the switcher and any
      // per-content-type eligibility lists refetch with the new space.
      invalidatesTags: ['Space'],
    }),
    moveToSpace: builder.mutation<MoveToSpaceResponse, MoveToSpaceRequest>({
      query: (body) => ({
        url: '/spaces/move',
        method: 'POST',
        data: body,
      }),
      // No Space-tag invalidation: moving entries never changes the space list.
      // The caches that DO go stale (the CM's document/list caches) are
      // invalidated by MoveToSpaceActions with targeted Document tags.
    }),
  }),
});

export const {
  useGetMineSpacesQuery,
  useGetAllSpacesQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useMoveToSpaceMutation,
} = endpoints;
