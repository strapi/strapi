import { i18nApi } from './api';

import type { GetISOLocales } from '../../../shared/contracts/iso-locales';
import type {
  GetLocales,
  CreateLocale,
  DeleteLocale,
  UpdateLocale,
} from '../../../shared/contracts/locales';

const localesApi = i18nApi.injectEndpoints({
  endpoints: (builder) => ({
    createLocale: builder.mutation<CreateLocale.Response, CreateLocale.Request['body']>({
      query: (data) => ({
        url: '/i18n/locales',
        method: 'POST',
        data,
      }),
      invalidatesTags: [{ type: 'Locale', id: 'LIST' }],
    }),
    deleteLocale: builder.mutation<DeleteLocale.Response, DeleteLocale.Params['id']>({
      query: (id) => ({
        url: `/i18n/locales/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Locale', id }],
    }),
    getLocales: builder.query<GetLocales.Response, void>({
      query: () => '/i18n/locales',
      providesTags: (res) => [
        { type: 'Locale', id: 'LIST' },
        ...(Array.isArray(res)
          ? res.map((locale) => ({
              type: 'Locale' as const,
              id: locale.id,
            }))
          : []),
      ],
    }),
    getDefaultLocales: builder.query<GetISOLocales.Response, void>({
      query: () => '/i18n/iso-locales',
    }),
    updateLocale: builder.mutation<
      UpdateLocale.Response,
      UpdateLocale.Request['body'] & UpdateLocale.Params
    >({
      query: ({ id, ...data }) => ({
        url: `/i18n/locales/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Locale', id }],
    }),
  }),
});

const {
  useCreateLocaleMutation,
  useDeleteLocaleMutation,
  useGetLocalesQuery,
  useGetDefaultLocalesQuery,
  useUpdateLocaleMutation,
} = localesApi;

export {
  useCreateLocaleMutation,
  useDeleteLocaleMutation,
  useGetLocalesQuery,
  useGetDefaultLocalesQuery,
  useUpdateLocaleMutation,
};
