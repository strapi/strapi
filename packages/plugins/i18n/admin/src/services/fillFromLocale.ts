import { i18nApi } from './api';

import type { FillFromLocale } from '../../../shared/contracts/content-manager';

const fillFromLocaleApi = i18nApi.injectEndpoints({
  endpoints: (builder) => ({
    getFillFromLocaleData: builder.query<FillFromLocale.Response, FillFromLocale.Params>({
      query: ({ model, ...params }) => ({
        url: `/i18n/content-manager/get-fill-from-locale/${model}`,
        config: { params },
      }),
    }),
  }),
});

export const { useGetFillFromLocaleDataQuery, useLazyGetFillFromLocaleDataQuery } =
  fillFromLocaleApi;
