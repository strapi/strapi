import { endUsersApi } from './api';

import type { PermissionRow } from '../../../shared/contracts/permissions';
import type {
  RoleDeleteResult,
  RoleDetail,
  RoleFile,
  RoleListItem,
  RoleUpdateBody,
} from '../../../shared/contracts/roles';

/** The admin routes answer `{ data }`. */
type Answer<T> = { data: T };

/** What creates a role: its details, and every one of its permissions. */
interface RoleCreateBody {
  name: string;
  description?: string | null;
  requireTwoFactor?: boolean;
  permissions: PermissionRow[];
}

/** What updates one: the role, and the save built on the revision the editor loaded. */
type RoleUpdateArgs = RoleUpdateBody & { documentId: string };

/**
 * `endUsersApi` is the admin's own `adminApi`, so its endpoints share one namespace with the admin
 * panel's (`getRoles`, `createRole`, `updateRole`, … already exist there for the admin roles):
 * every endpoint here is named for end users, and the hooks are exported under the plain names.
 */
const rolesApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => ({
    getEndUsersRoles: builder.query<RoleListItem[], void>({
      query: () => '/end-users/roles',
      transformResponse: (response: Answer<RoleListItem[]>) => response.data,
      providesTags: (roles) => [
        { type: 'EndUsersRole', id: 'LIST' },
        ...(roles ?? []).map((role) => ({
          type: 'EndUsersRole' as const,
          id: role.documentId,
        })),
      ],
    }),
    /**
     * Never takes a replacement role: the users of a deleted role keep their other roles, and
     * anyone left with none is given the default role (the server counts them in the answer).
     */
    deleteEndUsersRole: builder.mutation<RoleDeleteResult, string>({
      query: (documentId) => ({
        url: `/end-users/roles/${documentId}`,
        method: 'DELETE',
      }),
      transformResponse: (response: Answer<RoleDeleteResult>) => response.data,
      invalidatesTags: (_result, _error, documentId) => [
        { type: 'EndUsersRole', id: 'LIST' },
        { type: 'EndUsersRole', id: documentId },
      ],
    }),
    importEndUsersRole: builder.mutation<RoleDetail, RoleFile>({
      query: (file) => ({
        url: '/end-users/roles/import',
        method: 'POST',
        data: file,
      }),
      transformResponse: (response: Answer<RoleDetail>) => response.data,
      invalidatesTags: [{ type: 'EndUsersRole', id: 'LIST' }],
    }),
    /**
     * One role with its rows, its revision and the rows the server now refuses. Dropped as soon as
     * no page shows it, so an editor opened later starts from what is stored, not from a copy that
     * another admin may have changed since.
     */
    getEndUsersRole: builder.query<RoleDetail, string>({
      query: (documentId) => `/end-users/roles/${documentId}`,
      transformResponse: (response: Answer<RoleDetail>) => response.data,
      providesTags: (_result, _error, documentId) => [{ type: 'EndUsersRole', id: documentId }],
      keepUnusedDataFor: 0,
    }),
    /** The role file an export writes: the response is the file itself, not `{ data }`. */
    getEndUsersRoleFile: builder.query<RoleFile, string>({
      query: (documentId) => `/end-users/roles/${documentId}/export`,
      keepUnusedDataFor: 0,
    }),
  }),
});

/** A second call, so a write can name `getEndUsersRole` in the cache it updates. */
const rolesWriteApi = rolesApi.injectEndpoints({
  endpoints: (builder) => ({
    createEndUsersRole: builder.mutation<RoleDetail, RoleCreateBody>({
      query: (body) => ({
        url: '/end-users/roles',
        method: 'POST',
        data: body,
      }),
      transformResponse: (response: Answer<RoleDetail>) => response.data,
      invalidatesTags: [{ type: 'EndUsersRole', id: 'LIST' }],
    }),
    /**
     * A save the server refused changes nothing, so nothing is invalidated: the editor keeps its
     * edits. A save that went through answers the role as stored, with its new revision, and that
     * answer replaces the cached role, so the editor is loaded again without another request.
     */
    updateEndUsersRole: builder.mutation<RoleDetail, RoleUpdateArgs>({
      query: ({ documentId, ...body }) => ({
        url: `/end-users/roles/${documentId}`,
        method: 'PUT',
        data: body,
      }),
      transformResponse: (response: Answer<RoleDetail>) => response.data,
      async onQueryStarted({ documentId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(rolesApi.util.updateQueryData('getEndUsersRole', documentId, () => data));
        } catch {
          // Refused: the caller reads the error from the mutation's result
        }
      },
      invalidatesTags: (_result, error) => (error ? [] : [{ type: 'EndUsersRole', id: 'LIST' }]),
    }),
  }),
});

const {
  useGetEndUsersRolesQuery: useGetRolesQuery,
  useDeleteEndUsersRoleMutation: useDeleteRoleMutation,
  useImportEndUsersRoleMutation: useImportRoleMutation,
  useGetEndUsersRoleQuery: useGetRoleQuery,
  useLazyGetEndUsersRoleQuery: useLazyGetRoleQuery,
  useLazyGetEndUsersRoleFileQuery: useLazyGetRoleFileQuery,
} = rolesApi;

const {
  useCreateEndUsersRoleMutation: useCreateRoleMutation,
  useUpdateEndUsersRoleMutation: useUpdateRoleMutation,
} = rolesWriteApi;

export {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetRoleQuery,
  useGetRolesQuery,
  useImportRoleMutation,
  useLazyGetRoleFileQuery,
  useLazyGetRoleQuery,
  useUpdateRoleMutation,
};
export type { RoleCreateBody, RoleUpdateArgs };
