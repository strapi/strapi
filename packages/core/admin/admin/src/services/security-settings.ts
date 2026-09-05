/* eslint-disable check-file/filename-naming-convention */
import { adminApi } from './api';

import type {
  GetSecuritySettings,
  UpdateSecuritySettings,
} from '../../../shared/contracts/security-settings';

/**
 * Cycle 2 enforcement settings (`core_store` key `security-settings` plus the per-role
 * `mfaRequired` flags), read and written as one object through `/admin/security-settings`.
 * Both endpoints 404 while the feature is off (future flag or `admin.auth.mfa.enabled: false`);
 * the Security page treats that as its disabled-feature state.
 */
const securitySettingsService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['SecuritySettings', 'Mfa'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getSecuritySettings: builder.query<GetSecuritySettings.Response['data'], void>({
        query: () => ({ method: 'GET', url: '/admin/security-settings' }),
        transformResponse(res: GetSecuritySettings.Response) {
          return res.data;
        },
        providesTags: ['SecuritySettings'],
      }),
      updateSecuritySettings: builder.mutation<
        UpdateSecuritySettings.Response['data'],
        UpdateSecuritySettings.Request['body']
      >({
        query: (body) => ({ method: 'PUT', url: '/admin/security-settings', data: body }),
        transformResponse(res: UpdateSecuritySettings.Response) {
          return res.data;
        },
        // `Mfa` too: the caller's own `/admin/mfa/me` `required` flag follows the mode and the
        // role list, so the profile section and the grace banner must re-read it.
        invalidatesTags: ['SecuritySettings', 'Mfa'],
      }),
    }),
    overrideExisting: false,
  });

const { useGetSecuritySettingsQuery, useUpdateSecuritySettingsMutation } = securitySettingsService;

export { useGetSecuritySettingsQuery, useUpdateSecuritySettingsMutation };
