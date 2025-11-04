import { i18nApi } from './api';

import type { GetSettings, UpdateSettings } from '../../../shared/contracts/settings';

const settingsApi = i18nApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<GetSettings.Response['data'], void>({
      query: () => '/i18n/settings',
      providesTags: ['Settings'],
    }),
    updatei18nSettings: builder.mutation<UpdateSettings.Response, UpdateSettings.Request['body']>({
      query: (data) => ({
        url: '/i18n/settings',
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['Settings', 'AIFeatureConfig'],
    }),
  }),
});

const { useGetSettingsQuery, useUpdatei18nSettingsMutation } = settingsApi;

export { useGetSettingsQuery, useUpdatei18nSettingsMutation };
