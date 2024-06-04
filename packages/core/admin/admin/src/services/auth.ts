import { ProvidersOptions } from '../../../shared/contracts/admin';
import {
  type RenewToken,
  type Login,
  type ResetPassword,
  type RegisterAdmin,
  type Register,
  type RegistrationInfo,
  ForgotPassword,
} from '../../../shared/contracts/authentication';
import { Check } from '../../../shared/contracts/permissions';
import { GetProviders, IsSSOLocked } from '../../../shared/contracts/providers';
import { type GetOwnPermissions, type GetMe, type UpdateMe } from '../../../shared/contracts/users';

import { adminApi } from './api';

const authService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['User', 'Me', 'ProvidersOptions'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * ME
       */
      getMe: builder.query<GetMe.Response['data'], void>({
        query: () => ({
          method: 'GET',
          url: '/admin/users/me',
        }),
        transformResponse(res: GetMe.Response) {
          return res.data;
        },
        providesTags: (res) => (res ? ['Me', { type: 'User', id: res.id }] : ['Me']),
      }),
      getMyPermissions: builder.query<GetOwnPermissions.Response['data'], void>({
        query: () => ({
          method: 'GET',
          url: '/admin/users/me/permissions',
        }),
        transformResponse(res: GetOwnPermissions.Response) {
          return res.data;
        },
      }),
      updateMe: builder.mutation<UpdateMe.Response['data'], UpdateMe.Request['body']>({
        query: (body) => ({
          method: 'PUT',
          url: '/admin/users/me',
          data: body,
        }),
        transformResponse(res: UpdateMe.Response) {
          return res.data;
        },
        invalidatesTags: ['Me'],
      }),
      /**
       * Permissions
       */
      checkPermissions: builder.query<Check.Response, Check.Request['body']>({
        query: (permissions) => ({
          method: 'POST',
          url: '/admin/permissions/check',
          data: permissions,
        }),
      }),
      /**
       * Auth methods
       */
      login: builder.mutation<Login.Response['data'], Login.Request['body']>({
        query: (body) => ({
          method: 'POST',
          url: '/admin/login',
          data: body,
        }),
        transformResponse(res: Login.Response) {
          return res.data;
        },
        invalidatesTags: ['Me'],
      }),
      logout: builder.mutation<void, void>({
        query: () => ({
          method: 'POST',
          url: '/admin/logout',
        }),
      }),
      resetPassword: builder.mutation<
        ResetPassword.Response['data'],
        ResetPassword.Request['body']
      >({
        query: (body) => ({
          method: 'POST',
          url: '/admin/reset-password',
          data: body,
        }),
        transformResponse(res: ResetPassword.Response) {
          return res.data;
        },
      }),
      renewToken: builder.mutation<RenewToken.Response['data'], RenewToken.Request['body']>({
        query: (body) => ({
          method: 'POST',
          url: '/admin/renew-token',
          data: body,
        }),
        transformResponse(res: RenewToken.Response) {
          return res.data;
        },
      }),
      getRegistrationInfo: builder.query<
        RegistrationInfo.Response['data'],
        RegistrationInfo.Request['query']['registrationToken']
      >({
        query: (registrationToken) => ({
          url: '/admin/registration-info',
          method: 'GET',
          config: {
            params: {
              registrationToken,
            },
          },
        }),
        transformResponse(res: RegistrationInfo.Response) {
          return res.data;
        },
      }),
      registerAdmin: builder.mutation<
        RegisterAdmin.Response['data'],
        RegisterAdmin.Request['body']
      >({
        query: (body) => ({
          method: 'POST',
          url: '/admin/register-admin',
          data: body,
        }),
        transformResponse(res: RegisterAdmin.Response) {
          return res.data;
        },
      }),
      registerUser: builder.mutation<Register.Response['data'], Register.Request['body']>({
        query: (body) => ({
          method: 'POST',
          url: '/admin/register',
          data: body,
        }),
        transformResponse(res: Register.Response) {
          return res.data;
        },
      }),
      forgotPassword: builder.mutation<ForgotPassword.Response, ForgotPassword.Request['body']>({
        query: (body) => ({
          url: '/admin/forgot-password',
          method: 'POST',
          data: body,
        }),
      }),
      isSSOLocked: builder.query<IsSSOLocked.Response['data'], void>({
        query: () => ({
          url: '/admin/providers/isSSOLocked',
          method: 'GET',
        }),
        transformResponse(res: IsSSOLocked.Response) {
          return res.data;
        },
      }),
      getProviders: builder.query<GetProviders.Response, void>({
        query: () => ({
          url: '/admin/providers',
          method: 'GET',
        }),
      }),
      getProviderOptions: builder.query<ProvidersOptions.Response['data'], void>({
        query: () => ({
          url: '/admin/providers/options',
          method: 'GET',
        }),
        transformResponse(res: ProvidersOptions.Response) {
          return res.data;
        },
        providesTags: ['ProvidersOptions'],
      }),
      updateProviderOptions: builder.mutation<
        ProvidersOptions.Response['data'],
        ProvidersOptions.Request['body']
      >({
        query: (body) => ({
          url: '/admin/providers/options',
          method: 'PUT',
          data: body,
        }),
        transformResponse(res: ProvidersOptions.Response) {
          return res.data;
        },
        invalidatesTags: ['ProvidersOptions'],
      }),
    }),
    overrideExisting: false,
  });

const {
  useCheckPermissionsQuery,
  useLazyCheckPermissionsQuery,
  useGetMeQuery,
  useLoginMutation,
  useRenewTokenMutation,
  useLogoutMutation,
  useUpdateMeMutation,
  useResetPasswordMutation,
  useRegisterAdminMutation,
  useRegisterUserMutation,
  useGetRegistrationInfoQuery,
  useForgotPasswordMutation,
  useGetMyPermissionsQuery,
  useIsSSOLockedQuery,
  useGetProvidersQuery,
  useGetProviderOptionsQuery,
  useUpdateProviderOptionsMutation,
} = authService;

export {
  useCheckPermissionsQuery,
  useLazyCheckPermissionsQuery,
  useGetMeQuery,
  useLoginMutation,
  useRenewTokenMutation,
  useLogoutMutation,
  useUpdateMeMutation,
  useResetPasswordMutation,
  useRegisterAdminMutation,
  useRegisterUserMutation,
  useGetRegistrationInfoQuery,
  useForgotPasswordMutation,
  useGetMyPermissionsQuery,
  useIsSSOLockedQuery,
  useGetProvidersQuery,
  useGetProviderOptionsQuery,
  useUpdateProviderOptionsMutation,
};
