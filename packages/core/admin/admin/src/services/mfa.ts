import { adminApi } from './api';

import type {
  Disable,
  Enrol,
  ListTrustedDevices,
  ListUserTrustedDevices,
  MarkNoticesSeen,
  Me,
  Notices,
  RegenerateRecoveryCodes,
  RevokeTrustedDevice,
  RevokeUserTrustedDevices,
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
    addTagTypes: ['Mfa', 'MfaNotices', 'User', 'TrustedDevices', 'UserTrustedDevices'],
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
        // And `TrustedDevices`: a replacement revokes every trusted device (cycle 3).
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
        // Also invalidates `MfaNotices` (a `disabled` notice) and `TrustedDevices` (a disable
        // revokes every trusted device, cycle 3).
        invalidatesTags: ['Mfa', 'MfaNotices', 'TrustedDevices'],
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
       * Cycle 2: clear another admin's lock. Invalidating that user's `User` tag makes the edit
       * page (`useAdminUsers({ id })`) re-read `mfaLockedAt` / `mfaGraceUntil` without a reload.
       */
      unlockUserMfa: builder.mutation<void, UnlockUser.Params>({
        query: ({ id }) => ({ method: 'POST', url: `/admin/mfa/users/${id}/unlock` }),
        invalidatesTags: (_res, _err, { id }) => [{ type: 'User', id }],
      }),
      /**
       * Cycle 3: the caller's trusted browsers. The server marks `current` by hashing the httpOnly
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
  useUnlockUserMfaMutation,
  useGetTrustedDevicesQuery,
  useRevokeTrustedDeviceMutation,
  useRevokeAllTrustedDevicesMutation,
  useGetUserTrustedDevicesQuery,
  useRevokeUserTrustedDevicesMutation,
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
  useUnlockUserMfaMutation,
  useGetTrustedDevicesQuery,
  useRevokeTrustedDeviceMutation,
  useRevokeAllTrustedDevicesMutation,
  useGetUserTrustedDevicesQuery,
  useRevokeUserTrustedDevicesMutation,
};
