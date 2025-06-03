import { adminApi } from './api';

import type { List as ListContentApiPermissions } from '../../../shared/contracts/content-api/permissions';
import type { List as ListContentApiRoutes } from '../../../shared/contracts/content-api/routes';

const contentApiService = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<ListContentApiPermissions.Response['data'], void>({
      query: () => '/admin/content-api/permissions',
      transformResponse: (response: ListContentApiPermissions.Response) => response.data,
    }),
    getRoutes: builder.query<ListContentApiRoutes.Response['data'], void>({
      query: () => '/admin/content-api/routes',
      transformResponse: (response: ListContentApiRoutes.Response) => response.data,
    }),
  }),
  overrideExisting: false,
});

const { useGetPermissionsQuery, useGetRoutesQuery } = contentApiService;

export { useGetPermissionsQuery, useGetRoutesQuery };
