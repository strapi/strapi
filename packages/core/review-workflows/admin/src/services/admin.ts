import { SanitizedAdminUser } from '@strapi/admin/strapi-admin';

import { reviewWorkflowsApi } from './api';

type Roles = SanitizedAdminUser['roles'];
type RolesResponse = { data: Roles };

const adminApi = reviewWorkflowsApi.injectEndpoints({
  endpoints(builder) {
    return {
      getRoles: builder.query<Roles, void>({
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

const { useGetRolesQuery } = adminApi;

export { useGetRolesQuery };
export type { SanitizedAdminUser, Roles };
