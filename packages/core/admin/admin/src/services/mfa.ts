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

/**
 * Self-service second-factor endpoints for the authenticated admin. Every response here is
 * already sanitised by the server: the only place a secret or a recovery code ever appears is
 * the `enrol`, `verifyEnrolment` and `regenerateRecoveryCodes` responses, and the components
 * that call them keep those values in local state only.
 */
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
        // Also invalidates `MfaNotices`: the server raises an `enabled` notice for this event.
        // And `TrustedDevices`: a replacement revokes every trusted device. Deliberately
        // NOT `Passkeys`: passkeys's `completeEnrolment` leaves passkeys in place -- a new
        // authenticator app says nothing about the user's security keys.
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
      // `AcknowledgeRecoveryCodes.Request['body']` is `{}` -- the server reads nothing from the
      // request body for this endpoint -- so the mutation argument is typed `void` rather than
      // carrying a body type it never sends; callers invoke it as `acknowledge()`.
      acknowledgeRecoveryCodes: builder.mutation<void, void>({
        query: () => ({ method: 'POST', url: '/admin/mfa/recovery-codes/ack' }),
        invalidatesTags: ['Mfa'],
      }),
      disableMfa: builder.mutation<void, Disable.Request['body']>({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/disable', data: body }),
        // Also invalidates `MfaNotices` (a `disabled` notice), `TrustedDevices` (a disable
        // revokes every trusted device, trusted devices) and `Passkeys` (a disable deletes every passkey
        // inside the same transaction, passkeys).
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
      /**
       * Enforcement: clear another admin's lock. Invalidating that user's `User` tag makes the edit
       * page (`useAdminUsers({ id })`) re-read `mfaLockedAt` / `mfaGraceUntil` without a reload.
       */
      unlockUserMfa: builder.mutation<void, UnlockUser.Params>({
        query: ({ id }) => ({ method: 'POST', url: `/admin/mfa/users/${id}/unlock` }),
        invalidatesTags: (_res, _err, { id }) => [{ type: 'User', id }],
      }),
      /**
       * Strip another admin's second factor entirely: the way back for a user who has lost their
       * authenticator and spent their recovery codes. Invalidates that user's `User` tag so the
       * edit page re-reads enrolment and lock state, and both device tags, because the reset
       * clears trusted devices and passkeys along with the factor.
       */
      resetUserMfa: builder.mutation<void, ResetUser.Params>({
        query: ({ id }) => ({ method: 'POST', url: `/admin/mfa/users/${id}/reset` }),
        invalidatesTags: (_res, _err, { id }) => [
          { type: 'User', id },
          { type: 'UserTrustedDevices', id },
          { type: 'UserPasskeys', id },
        ],
      }),
      /**
       * Trusted devices: the caller's trusted browsers. The server marks `current` by hashing the httpOnly
       * trust cookie the browser sends along; nothing here ever sees the token.
       */
      getTrustedDevices: builder.query<ListTrustedDevices.Response['data'], void>({
        query: () => ({ method: 'GET', url: '/admin/mfa/trusted-devices' }),
        transformResponse(res: ListTrustedDevices.Response) {
          return res.data;
        },
        providesTags: ['TrustedDevices'],
      }),
      // Both revocations also invalidate `MfaNotices`: the server records a
      // `device_trust_revoked` notice for the caller.
      revokeTrustedDevice: builder.mutation<void, RevokeTrustedDevice.Params>({
        query: ({ id }) => ({ method: 'DELETE', url: `/admin/mfa/trusted-devices/${id}` }),
        invalidatesTags: ['TrustedDevices', 'MfaNotices'],
      }),
      revokeAllTrustedDevices: builder.mutation<void, void>({
        query: () => ({ method: 'DELETE', url: '/admin/mfa/trusted-devices' }),
        invalidatesTags: ['TrustedDevices', 'MfaNotices'],
      }),
      /** An administrator's view of another user's trusted browsers (`admin::users.read`). */
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
      /**
       * Administrator revocation (`admin::users.update`); refreshes that user's list. Also
       * invalidates `TrustedDevices`: an administrator may be revoking their own user page, and
       * that must refresh their own profile list too.
       */
      revokeUserTrustedDevices: builder.mutation<void, RevokeUserTrustedDevices.Params>({
        query: ({ id }) => ({ method: 'DELETE', url: `/admin/mfa/users/${id}/trusted-devices` }),
        invalidatesTags: (_res, _err, { id }) => [
          { type: 'UserTrustedDevices', id },
          'TrustedDevices',
        ],
      }),
      /**
       * Passkeys: the caller's own passkeys. The server answers an empty list -- not a 404 and not
       * an error -- while the organisation has passkeys turned off, so the profile shows its empty
       * state rather than a failure. Only the four public fields come back.
       */
      getPasskeys: builder.query<ListPasskeys.Response['data'], void>({
        query: () => ({ method: 'GET', url: '/admin/mfa/passkeys' }),
        transformResponse(res: ListPasskeys.Response) {
          return res.data;
        },
        providesTags: ['Passkeys'],
      }),
      /**
       * Step one of registration. A mutation rather than a query even though it reads like one:
       * it mints server state (the single-use pending ceremony on the user row) and charges the
       * caller's password and live code, so it must never be cached, deduplicated or refetched.
       */
      passkeyRegistrationOptions: builder.mutation<
        PasskeyRegistrationOptions.Response['data'],
        PasskeyRegistrationOptions.Request['body']
      >({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/passkeys/options', data: body }),
        transformResponse(res: PasskeyRegistrationOptions.Response) {
          return res.data;
        },
      }),
      /**
       * Step two. Also invalidates `MfaNotices`: the server records a `passkey_registered` notice
       * row, the precedent trusted devices set for both trusted-device revocations. Deliberately does NOT
       * invalidate `TrustedDevices` -- trusted devices's ledger recorded that trap; registering a passkey
       * changes no trusted device, and only a *replacement* revokes trust.
       */
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
      /** 204, no body. Also a `passkey_removed` notice row, hence `MfaNotices`. */
      deletePasskey: builder.mutation<void, DeletePasskey.Params>({
        query: ({ id }) => ({ method: 'DELETE', url: `/admin/mfa/passkeys/${id}` }),
        invalidatesTags: ['Passkeys', 'MfaNotices'],
      }),
      /**
       * An administrator's view of another user's passkeys (`admin::users.read`): a count only,
       * never an inventory of somebody's hardware.
       */
      getUserPasskeys: builder.query<ListUserPasskeys.Response['data'], ListUserPasskeys.Params>({
        query: ({ id }) => ({ method: 'GET', url: `/admin/mfa/users/${id}/passkeys` }),
        transformResponse(res: ListUserPasskeys.Response) {
          return res.data;
        },
        providesTags: (_res, _err, { id }) => [{ type: 'UserPasskeys', id }],
      }),
      /**
       * Administrator removal (`admin::users.update`). Invalidates both passkey tags -- an
       * administrator may be on their *own* user page, which must refresh their own profile list
       * too, the same as `revokeUserTrustedDevices` -- and `MfaNotices`, because the server
       * records a `passkey_removed` notice for the target.
       */
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
