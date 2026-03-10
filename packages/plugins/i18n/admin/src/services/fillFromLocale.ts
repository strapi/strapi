import { i18nApi } from './api';

interface FillFromLocaleArgs {
  model: string;
  documentId: string;
  sourceLocale: string;
  targetLocale: string;
  collectionType: 'collection-types' | 'single-types';
}

interface FillFromLocaleResponse {
  data: Record<string, unknown>;
}

const fillFromLocaleApi = i18nApi.injectEndpoints({
  endpoints: (builder) => ({
    getFillFromLocaleData: builder.mutation<FillFromLocaleResponse, FillFromLocaleArgs>({
      query: (body) => ({
        url: '/i18n/content-manager/actions/fill-from-locale',
        method: 'POST',
        data: body,
      }),
    }),
  }),
});

export const { useGetFillFromLocaleDataMutation } = fillFromLocaleApi;
