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
      invalidatesTags: [{ type: 'Locale', id: 'LIST' }, 'HomepageKeyStatistics'],
    }),
    deleteLocale: builder.mutation<DeleteLocale.Response, DeleteLocale.Params['id']>({
      query: (id) => ({
        url: `/i18n/locales/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Locale', id }, 'HomepageKeyStatistics'],
    }),
    /**
     * `scope: 'all'` opts out of the per-space visibility filter applied when
     * `@strapi/plugin-spaces` is installed — the Settings page passes it so a
     * locale bound to another space stays manageable from any active space.
     * Scoped consumers (CM locale picker, header actions) call with no arg.
     * Both cache entries provide the same `Locale` tags, so locale mutations
     * refetch whichever variants are mounted.
     */
    getLocales: builder.query<GetLocales.Response, { scope?: 'all' } | void>({
      query: (params) => (params?.scope === 'all' ? '/i18n/locales?scope=all' : '/i18n/locales'),
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
