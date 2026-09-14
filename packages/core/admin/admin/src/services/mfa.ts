import { adminApi } from './api';

import type {
  DeletePasskey,
  DeleteUserPasskeys,
  Disable,
  Enrol,
  ListPasskeys,
  ListTrustedDevices,
  ListUserPasskeys,
  ListUserTrustedDevices,
  MarkNoticesSeen,
  Me,
  Notices,
  PasskeyRegistrationOptions,
  RegenerateRecoveryCodes,
  RegisterPasskey,
  RevokeTrustedDevice,
  RevokeUserTrustedDevices,
  ResetUser,
  UnlockUser,
  VerifyEnrolment,
} from '../../../shared/contracts/mfa';

/** The only responses carrying a secret or a recovery code are `enrol`, `verifyEnrolment` and
 * `regenerateRecoveryCodes`. Those land in the mutation cache like any other, which is why each
 * carries a `fixedCacheKey` its dialog can `reset()` on close. */
const mfaService = adminApi
  .enhanceEndpoints({
    addTagTypes: [
      'Mfa',
      'MfaNotices',
      'User',
      'TrustedDevices',
      'UserTrustedDevices',
      'Passkeys',
      'UserPasskeys',
    ],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getMfaStatus: builder.query<Me.Response['data'], void>({
        query: () => ({ method: 'GET', url: '/admin/mfa/me' }),
        transformResponse(res: Me.Response) {
          return res.data;
        },
        providesTags: ['Mfa'],
      }),
      enrolMfa: builder.mutation<Enrol.Response['data'], Enrol.Request['body']>({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/enrol', data: body }),
        transformResponse(res: Enrol.Response) {
          return res.data;
        },
      }),
      verifyMfaEnrolment: builder.mutation<
        VerifyEnrolment.Response['data'],
        VerifyEnrolment.Request['body']
      >({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/enrol/verify', data: body }),
        transformResponse(res: VerifyEnrolment.Response) {
          return res.data;
        },
        // Not `Passkeys`: `completeEnrolment` leaves them in place, because a new authenticator app says
        // nothing about the user's security keys.
        invalidatesTags: ['Mfa', 'MfaNotices', 'TrustedDevices'],
      }),
      regenerateRecoveryCodes: builder.mutation<
        RegenerateRecoveryCodes.Response['data'],
        RegenerateRecoveryCodes.Request['body']
      >({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/recovery-codes', data: body }),
        transformResponse(res: RegenerateRecoveryCodes.Response) {
          return res.data;
        },
        invalidatesTags: ['Mfa'],
      }),
      // `void` rather than the empty body type, so callers invoke it as `acknowledge()`.
      acknowledgeRecoveryCodes: builder.mutation<void, void>({
        query: () => ({ method: 'POST', url: '/admin/mfa/recovery-codes/ack' }),
        invalidatesTags: ['Mfa'],
      }),
      disableMfa: builder.mutation<void, Disable.Request['body']>({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/disable', data: body }),
        invalidatesTags: ['Mfa', 'MfaNotices', 'TrustedDevices', 'Passkeys'],
      }),
      getMfaNotices: builder.query<Notices.Response['data'], void>({
        query: () => ({ method: 'GET', url: '/admin/mfa/notices' }),
        transformResponse(res: Notices.Response) {
          return res.data;
        },
        providesTags: ['MfaNotices'],
      }),
      markMfaNoticesSeen: builder.mutation<void, MarkNoticesSeen.Request['body']>({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/notices/seen', data: body }),
        invalidatesTags: ['MfaNotices'],
      }),
      /** The `User` tag makes the edit page re-read `mfaLockedAt`/`mfaGraceUntil` without a reload. */
      unlockUserMfa: builder.mutation<void, UnlockUser.Params>({
        query: ({ id }) => ({ method: 'POST', url: `/admin/mfa/users/${id}/unlock` }),
        invalidatesTags: (_res, _err, { id }) => [{ type: 'User', id }],
      }),
      /** Both device tags too, because the reset clears trusted devices and passkeys with the factor. */
      resetUserMfa: builder.mutation<void, ResetUser.Params>({
        query: ({ id }) => ({ method: 'POST', url: `/admin/mfa/users/${id}/reset` }),
        invalidatesTags: (_res, _err, { id }) => [
          { type: 'User', id },
          { type: 'UserTrustedDevices', id },
          { type: 'UserPasskeys', id },
        ],
      }),
      /** The server marks `current` by hashing the httpOnly cookie; nothing here sees the token. */
      getTrustedDevices: builder.query<ListTrustedDevices.Response['data'], void>({
        query: () => ({ method: 'GET', url: '/admin/mfa/trusted-devices' }),
        transformResponse(res: ListTrustedDevices.Response) {
          return res.data;
        },
        providesTags: ['TrustedDevices'],
      }),
      revokeTrustedDevice: builder.mutation<void, RevokeTrustedDevice.Params>({
        query: ({ id }) => ({ method: 'DELETE', url: `/admin/mfa/trusted-devices/${id}` }),
        invalidatesTags: ['TrustedDevices', 'MfaNotices'],
      }),
      revokeAllTrustedDevices: builder.mutation<void, void>({
        query: () => ({ method: 'DELETE', url: '/admin/mfa/trusted-devices' }),
        invalidatesTags: ['TrustedDevices', 'MfaNotices'],
      }),
      getUserTrustedDevices: builder.query<
        ListUserTrustedDevices.Response['data'],
        ListUserTrustedDevices.Params
      >({
        query: ({ id }) => ({ method: 'GET', url: `/admin/mfa/users/${id}/trusted-devices` }),
        transformResponse(res: ListUserTrustedDevices.Response) {
          return res.data;
        },
        providesTags: (_res, _err, { id }) => [{ type: 'UserTrustedDevices', id }],
      }),
      /** Also `TrustedDevices`: an administrator may be on their own user page, which must refresh
       * their profile list too. */
      revokeUserTrustedDevices: builder.mutation<void, RevokeUserTrustedDevices.Params>({
        query: ({ id }) => ({ method: 'DELETE', url: `/admin/mfa/users/${id}/trusted-devices` }),
        invalidatesTags: (_res, _err, { id }) => [
          { type: 'UserTrustedDevices', id },
          'TrustedDevices',
        ],
      }),
      /** An empty list, not a 404, while the policy is off, so the profile shows its empty state rather
       * than a failure. */
      getPasskeys: builder.query<ListPasskeys.Response['data'], void>({
        query: () => ({ method: 'GET', url: '/admin/mfa/passkeys' }),
        transformResponse(res: ListPasskeys.Response) {
          return res.data;
        },
        providesTags: ['Passkeys'],
      }),
      /** A mutation, not a query: it mints the single-use ceremony and charges a password and live
       * code, so it must never be cached, deduplicated or refetched. */
      passkeyRegistrationOptions: builder.mutation<
        PasskeyRegistrationOptions.Response['data'],
        PasskeyRegistrationOptions.Request['body']
      >({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/passkeys/options', data: body }),
        transformResponse(res: PasskeyRegistrationOptions.Response) {
          return res.data;
        },
      }),
      /** Not `TrustedDevices`: registering a passkey revokes no trust, only a *replacement* does. */
      registerPasskey: builder.mutation<
        RegisterPasskey.Response['data'],
        RegisterPasskey.Request['body']
      >({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/passkeys', data: body }),
        transformResponse(res: RegisterPasskey.Response) {
          return res.data;
        },
        invalidatesTags: ['Passkeys', 'MfaNotices'],
      }),
      deletePasskey: builder.mutation<void, DeletePasskey.Params>({
        query: ({ id }) => ({ method: 'DELETE', url: `/admin/mfa/passkeys/${id}` }),
        invalidatesTags: ['Passkeys', 'MfaNotices'],
      }),
      /** A count only, never an inventory of somebody's hardware. */
      getUserPasskeys: builder.query<ListUserPasskeys.Response['data'], ListUserPasskeys.Params>({
        query: ({ id }) => ({ method: 'GET', url: `/admin/mfa/users/${id}/passkeys` }),
        transformResponse(res: ListUserPasskeys.Response) {
          return res.data;
        },
        providesTags: (_res, _err, { id }) => [{ type: 'UserPasskeys', id }],
      }),
      /** Both passkey tags, as `revokeUserTrustedDevices` does: an administrator may be on their own
       * user page. */
      deleteUserPasskeys: builder.mutation<void, DeleteUserPasskeys.Params>({
        query: ({ id }) => ({ method: 'DELETE', url: `/admin/mfa/users/${id}/passkeys` }),
        invalidatesTags: (_res, _err, { id }) => [
          { type: 'UserPasskeys', id },
          'Passkeys',
          'MfaNotices',
        ],
      }),
    }),
    overrideExisting: false,
  });

const {
  useGetMfaStatusQuery,
  useEnrolMfaMutation,
  useVerifyMfaEnrolmentMutation,
  useRegenerateRecoveryCodesMutation,
  useAcknowledgeRecoveryCodesMutation,
  useDisableMfaMutation,
  useGetMfaNoticesQuery,
  useMarkMfaNoticesSeenMutation,
  useResetUserMfaMutation,
  useUnlockUserMfaMutation,
  useGetTrustedDevicesQuery,
  useRevokeTrustedDeviceMutation,
  useRevokeAllTrustedDevicesMutation,
  useGetUserTrustedDevicesQuery,
  useRevokeUserTrustedDevicesMutation,
  useGetPasskeysQuery,
  usePasskeyRegistrationOptionsMutation,
  useRegisterPasskeyMutation,
  useDeletePasskeyMutation,
  useGetUserPasskeysQuery,
  useDeleteUserPasskeysMutation,
} = mfaService;

export {
  useGetMfaStatusQuery,
  useEnrolMfaMutation,
  useVerifyMfaEnrolmentMutation,
  useRegenerateRecoveryCodesMutation,
  useAcknowledgeRecoveryCodesMutation,
  useDisableMfaMutation,
  useGetMfaNoticesQuery,
  useMarkMfaNoticesSeenMutation,
  useResetUserMfaMutation,
  useUnlockUserMfaMutation,
  useGetTrustedDevicesQuery,
  useRevokeTrustedDeviceMutation,
  useRevokeAllTrustedDevicesMutation,
  useGetUserTrustedDevicesQuery,
  useRevokeUserTrustedDevicesMutation,
  useGetPasskeysQuery,
  usePasskeyRegistrationOptionsMutation,
  useRegisterPasskeyMutation,
  useDeletePasskeyMutation,
  useGetUserPasskeysQuery,
  useDeleteUserPasskeysMutation,
};
