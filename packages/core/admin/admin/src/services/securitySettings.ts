import { adminApi } from './api';

import type {
  GetSecuritySettings,
  UpdateSecuritySettings,
} from '../../../shared/contracts/security-settings';

/** Both endpoints 404 while the feature is off, which the Security page treats as its
 * disabled-feature state. */
const securitySettingsService = adminApi
  .enhanceEndpoints({
    addTagTypes: [
      'SecuritySettings',
      'Mfa',
      'TrustedDevices',
      'UserTrustedDevices',
      'Passkeys',
      'UserPasskeys',
    ],
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
        // `Mfa`, because the caller's own `/admin/mfa/me` flags follow these settings. The device tags,
        // because turning either feature off deletes the rows the client is holding, server-side.
        invalidatesTags: [
          'SecuritySettings',
          'Mfa',
          'TrustedDevices',
          'UserTrustedDevices',
          'Passkeys',
          'UserPasskeys',
        ],
      }),
    }),
    overrideExisting: false,
  });

const { useGetSecuritySettingsQuery, useUpdateSecuritySettingsMutation } = securitySettingsService;

export { useGetSecuritySettingsQuery, useUpdateSecuritySettingsMutation };
