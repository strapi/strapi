import { endUsersApi } from './api';

import type { BanUserRequest, UserSecurityResponse } from '../../../shared/contracts/user-security';

/** What the Content Manager's list of profiles answers: only the id is read */
interface ProfileListResponse {
  results: Array<{ documentId: string }>;
}

interface SessionArgs {
  documentId: string;
  sessionId: string;
}

interface AccountArgs {
  documentId: string;
  accountId: string;
}

type BanArgs = BanUserRequest & { documentId: string };

const PROFILE_UID = 'plugin::end-users.profile';

/**
 * One end user's security, for the Content Manager's Security panel. Every action answers
 * `{ data: { ok: true } }` and refreshes what the panel shows. The endpoints are named for end
 * users: `endUsersApi` is the admin's own `adminApi`, and its endpoint names share one namespace.
 */
const userSecurityApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => {
    const action = (url: (documentId: string) => string, method: 'POST' | 'DELETE' = 'POST') =>
      builder.mutation<void, string>({
        query: (documentId) => ({ url: url(documentId), method }),
        invalidatesTags: (_result, _error, documentId) => [
          { type: 'EndUsersUserSecurity', id: documentId },
        ],
      });

    return {
      getEndUsersUserSecurity: builder.query<UserSecurityResponse['data'], string>({
        query: (documentId) => `/end-users/users/${documentId}/security`,
        transformResponse: (response: UserSecurityResponse) => response.data,
        providesTags: (_result, _error, documentId) => [
          { type: 'EndUsersUserSecurity', id: documentId },
        ],
      }),
      revokeEndUsersUserSession: builder.mutation<void, SessionArgs>({
        query: ({ documentId, sessionId }) => ({
          url: `/end-users/users/${documentId}/sessions/${sessionId}`,
          method: 'DELETE',
        }),
        invalidatesTags: (_result, _error, { documentId }) => [
          { type: 'EndUsersUserSecurity', id: documentId },
        ],
      }),
      revokeEndUsersUserSessions: action((id) => `/end-users/users/${id}/sessions`, 'DELETE'),
      unlinkEndUsersUserAccount: builder.mutation<void, AccountArgs>({
        query: ({ documentId, accountId }) => ({
          url: `/end-users/users/${documentId}/accounts/${accountId}`,
          method: 'DELETE',
        }),
        invalidatesTags: (_result, _error, { documentId }) => [
          { type: 'EndUsersUserSecurity', id: documentId },
        ],
      }),
      banEndUsersUser: builder.mutation<void, BanArgs>({
        query: ({ documentId, ...body }) => ({
          url: `/end-users/users/${documentId}/ban`,
          method: 'POST',
          data: body,
        }),
        invalidatesTags: (_result, _error, { documentId }) => [
          { type: 'EndUsersUserSecurity', id: documentId },
        ],
      }),
      unbanEndUsersUser: action((id) => `/end-users/users/${id}/unban`),
      unlockEndUsersUser: action((id) => `/end-users/users/${id}/unlock`),
      resetEndUsersUserTwoFactor: action((id) => `/end-users/users/${id}/two-factor/reset`),
      sendEndUsersUserPasswordReset: action((id) => `/end-users/users/${id}/send-password-reset`),
      sendEndUsersUserVerification: action((id) => `/end-users/users/${id}/send-verification`),
      /** The documentId of a user's one profile, found by its `user` relation */
      getEndUsersUserProfile: builder.query<string | null, string>({
        query: (documentId) => ({
          url: `/content-manager/collection-types/${PROFILE_UID}`,
          method: 'GET',
          config: {
            params: {
              page: 1,
              pageSize: 1,
              filters: { $and: [{ user: { documentId: { $eq: documentId } } }] },
            },
          },
        }),
        transformResponse: (response: ProfileListResponse) =>
          response.results[0]?.documentId ?? null,
      }),
    };
  },
});

const {
  useGetEndUsersUserSecurityQuery: useGetUserSecurityQuery,
  useRevokeEndUsersUserSessionMutation: useRevokeUserSessionMutation,
  useRevokeEndUsersUserSessionsMutation: useRevokeUserSessionsMutation,
  useUnlinkEndUsersUserAccountMutation: useUnlinkUserAccountMutation,
  useBanEndUsersUserMutation: useBanUserMutation,
  useUnbanEndUsersUserMutation: useUnbanUserMutation,
  useUnlockEndUsersUserMutation: useUnlockUserMutation,
  useResetEndUsersUserTwoFactorMutation: useResetUserTwoFactorMutation,
  useSendEndUsersUserPasswordResetMutation: useSendUserPasswordResetMutation,
  useSendEndUsersUserVerificationMutation: useSendUserVerificationMutation,
  useGetEndUsersUserProfileQuery: useGetUserProfileQuery,
} = userSecurityApi;

export {
  useGetUserSecurityQuery,
  useRevokeUserSessionMutation,
  useRevokeUserSessionsMutation,
  useUnlinkUserAccountMutation,
  useBanUserMutation,
  useUnbanUserMutation,
  useUnlockUserMutation,
  useResetUserTwoFactorMutation,
  useSendUserPasswordResetMutation,
  useSendUserVerificationMutation,
  useGetUserProfileQuery,
};
