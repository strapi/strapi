import { adminApi } from './api';

import type {
  AcknowledgeRecoveryCodes,
  Disable,
  Enrol,
  MarkNoticesSeen,
  Me,
  Notices,
  RegenerateRecoveryCodes,
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
    addTagTypes: ['Mfa', 'MfaNotices'],
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
        invalidatesTags: ['Mfa'],
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
      acknowledgeRecoveryCodes: builder.mutation<void, AcknowledgeRecoveryCodes.Request['body']>({
        query: () => ({ method: 'POST', url: '/admin/mfa/recovery-codes/ack' }),
        invalidatesTags: ['Mfa'],
      }),
      disableMfa: builder.mutation<void, Disable.Request['body']>({
        query: (body) => ({ method: 'POST', url: '/admin/mfa/disable', data: body }),
        invalidatesTags: ['Mfa'],
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
};
