import { adminApi } from '@strapi/admin/strapi-admin';

export interface Space {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string | null;
  status: 'active' | 'archived';
  isDefault: boolean;
  contentTypes?: string[] | null;
}

export interface SpaceMember {
  id: number;
  user: {
    id: number;
    firstname?: string;
    lastname?: string;
    email: string;
    roles?: Array<{ id: number; name: string }>;
  };
  roles: Array<{ id: number; name: string }>;
}

export interface MySpaces {
  data: Space[];
  /** Slug of the space in force, `*` for the all-spaces view, or null when there is none. */
  current: string | null;
  canAccessAll: boolean;
  /** Why the caller has no space, when they have none. */
  unavailableReason?: string;
}

export interface SpacesSettings {
  contentTypes: Array<{ uid: string; displayName: string }>;
  maxSpaces: number | null;
  /** Rows belonging to no space, per model — content every space can see. */
  sharedRows: Record<string, number>;
}

const spacesApi = adminApi
  .enhanceEndpoints({ addTagTypes: ['Space', 'SpaceMember', 'MySpaces'] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getMySpaces: builder.query<MySpaces, void>({
        query: () => '/spaces/mine',
        providesTags: ['MySpaces'],
      }),

      getSpaces: builder.query<Space[], void>({
        query: () => '/spaces/spaces',
        transformResponse: (response: { data: Space[] }) => response.data,
        providesTags: ['Space'],
      }),

      getSpacesSettings: builder.query<SpacesSettings, void>({
        query: () => '/spaces/settings',
        transformResponse: (response: { data: SpacesSettings }) => response.data,
        providesTags: ['Space'],
      }),

      createSpace: builder.mutation<Space, Partial<Space>>({
        query: (body) => ({ url: '/spaces/spaces', method: 'POST', data: body }),
        transformResponse: (response: { data: Space }) => response.data,
        invalidatesTags: ['Space', 'MySpaces'],
      }),

      updateSpace: builder.mutation<Space, { id: number; data: Partial<Space> }>({
        query: ({ id, data }) => ({ url: `/spaces/spaces/${id}`, method: 'PUT', data }),
        transformResponse: (response: { data: Space }) => response.data,
        invalidatesTags: ['Space', 'MySpaces'],
      }),

      setDefaultSpace: builder.mutation<Space, number>({
        query: (id) => ({ url: `/spaces/spaces/${id}/default`, method: 'PUT' }),
        transformResponse: (response: { data: Space }) => response.data,
        invalidatesTags: ['Space', 'MySpaces'],
      }),

      getDeletionPreview: builder.query<
        { space: Space; entries: Record<string, number>; members: number },
        number
      >({
        query: (id) => `/spaces/spaces/${id}/deletion-preview`,
        transformResponse: (response: {
          data: { space: Space; entries: Record<string, number>; members: number };
        }) => response.data,
      }),

      deleteSpace: builder.mutation<unknown, number>({
        query: (id) => ({ url: `/spaces/spaces/${id}`, method: 'DELETE' }),
        invalidatesTags: ['Space', 'MySpaces'],
      }),

      getMembers: builder.query<SpaceMember[], number>({
        query: (spaceId) => `/spaces/spaces/${spaceId}/members`,
        transformResponse: (response: { data: SpaceMember[] }) => response.data,
        providesTags: ['SpaceMember'],
      }),

      getMemberCandidates: builder.query<SpaceMember['user'][], number>({
        query: (spaceId) => `/spaces/spaces/${spaceId}/members/candidates`,
        transformResponse: (response: { data: SpaceMember['user'][] }) => response.data,
        providesTags: ['SpaceMember'],
      }),

      upsertMember: builder.mutation<
        SpaceMember,
        { spaceId: number; user: number; roles?: number[] }
      >({
        query: ({ spaceId, ...body }) => ({
          url: `/spaces/spaces/${spaceId}/members`,
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: { data: SpaceMember }) => response.data,
        invalidatesTags: ['SpaceMember', 'MySpaces'],
      }),

      removeMember: builder.mutation<unknown, { spaceId: number; userId: number }>({
        query: ({ spaceId, userId }) => ({
          url: `/spaces/spaces/${spaceId}/members/${userId}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['SpaceMember', 'MySpaces'],
      }),
    }),
  });

export const {
  useGetMySpacesQuery,
  useGetSpacesQuery,
  useGetSpacesSettingsQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useSetDefaultSpaceMutation,
  useGetDeletionPreviewQuery,
  useDeleteSpaceMutation,
  useGetMembersQuery,
  useGetMemberCandidatesQuery,
  useUpsertMemberMutation,
  useRemoveMemberMutation,
} = spacesApi;

export { spacesApi };
