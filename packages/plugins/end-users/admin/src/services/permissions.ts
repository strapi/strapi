import { endUsersApi } from './api';

import type { BoundRoute, PermissionLayout } from '../../../shared/contracts/permissions';

/** The admin routes answer `{ data }`. */
type Answer<T> = { data: T };

/**
 * What the role editor is drawn from, and the routes bound to what it shows. The endpoints are
 * named for end users: `endUsersApi` is the admin's own `adminApi`, which has its own
 * `getRolePermissionLayout` and more.
 */
const permissionsApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => ({
    /** The content types, fields, actions and route groups of the project */
    getEndUsersPermissionLayout: builder.query<PermissionLayout, void>({
      query: () => '/end-users/permissions/layout',
      transformResponse: (response: Answer<PermissionLayout>) => response.data,
      providesTags: [{ type: 'EndUsersLayout', id: 'LAYOUT' }],
    }),
    /** The routes of a content type, or of a route group, with the policies and middlewares each runs */
    getEndUsersBoundRoutes: builder.query<BoundRoute[], string>({
      query: (subject) => ({
        url: '/end-users/permissions/routes',
        method: 'GET',
        config: { params: { subject } },
      }),
      transformResponse: (response: Answer<BoundRoute[]>) => response.data,
      providesTags: (_result, _error, subject) => [{ type: 'EndUsersLayout', id: subject }],
    }),
  }),
});

const {
  useGetEndUsersPermissionLayoutQuery: useGetPermissionLayoutQuery,
  useGetEndUsersBoundRoutesQuery: useGetBoundRoutesQuery,
} = permissionsApi;

export { useGetBoundRoutesQuery, useGetPermissionLayoutQuery };
