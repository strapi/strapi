import { SanitizedAdminUser } from '@strapi/admin/strapi-admin';

import { reviewWorkflowsApi } from './api';

type Roles = SanitizedAdminUser['roles'];
type RolesResponse = { data: Roles };

const adminApi = reviewWorkflowsApi.injectEndpoints({
  endpoints(builder) {
    return {
      getAdminRoles: builder.query<Roles, void>({
        query: () => ({
          url: `/admin/roles`,
          method: 'GET',
        }),
        transformResponse: (res: RolesResponse) => {
          return res.data;
        },
      }),
    };
  },
});

const { useGetAdminRolesQuery } = adminApi;

export { useGetAdminRolesQuery };
export type { SanitizedAdminUser, Roles };
