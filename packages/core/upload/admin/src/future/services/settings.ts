import { uploadApi } from './api';

import type { GetSettings } from '../../../../shared/contracts/settings';

const settingsApi = uploadApi.injectEndpoints({
  endpoints: (builder) => ({
    // Deliberately NOT named `getSettings`. Every plugin's admin API is built on
    // the same shared `adminApi` instance — one endpoint registry keyed by name,
    // under `reducerPath: 'adminApi'` — and `injectEndpoints` silently keeps the
    // FIRST registration of a duplicate name and discards later ones. The i18n
    // plugin already registers a `getSettings`, so a generic name here would,
    // depending on module load order, resolve this hook to i18n's cache entry
    // (`/i18n/settings`) instead of `/upload/settings` — non-deterministically.
    getUploadSettings: builder.query<GetSettings.Response['data'], void>({
      query: () => ({
        url: '/upload/settings',
        method: 'GET',
      }),
    }),
  }),
});

const { useGetUploadSettingsQuery } = settingsApi;

export { useGetUploadSettingsQuery };
