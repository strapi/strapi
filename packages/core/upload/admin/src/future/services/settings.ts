import { uploadApi } from './api';

import type { GetSettings } from '../../../../shared/contracts/settings';

const settingsApi = uploadApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<GetSettings.Response['data'], void>({
      query: () => ({
        url: '/upload/settings',
        method: 'GET',
      }),
    }),
  }),
});

const { useGetSettingsQuery } = settingsApi;

export { useGetSettingsQuery };
