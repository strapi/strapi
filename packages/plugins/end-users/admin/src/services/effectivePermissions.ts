import { endUsersApi } from './api';

import type { EffectivePermissionsResponse } from '../../../shared/contracts/user-security';

/**
 * What one end user holds, read for the Content Manager's Security panel. The endpoint is named
 * for end users: `endUsersApi` is the admin's own `adminApi`, and its endpoint names share one
 * namespace.
 */
const effectivePermissionsApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => ({
    getEndUsersEffectivePermissions: builder.query<EffectivePermissionsResponse['data'], string>({
      query: (documentId) => `/end-users/users/${documentId}/effective-permissions`,
      transformResponse: (response: EffectivePermissionsResponse) => response.data,
      // Roles and their rows change on their own: what is read now is what is shown now
      keepUnusedDataFor: 0,
    }),
  }),
});

const { useGetEndUsersEffectivePermissionsQuery: useGetEffectivePermissionsQuery } =
  effectivePermissionsApi;

export { useGetEffectivePermissionsQuery };
