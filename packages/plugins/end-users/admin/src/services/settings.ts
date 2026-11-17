import { endUsersApi } from './api';

import type { EndUsersSettingsPatch, SettingsResponse } from '../../../shared/contracts/settings';

/** The attributes of a content type, as the Content Manager lists them: only what this reads */
interface ProfileSchema {
  uid: string;
  attributes: Record<string, { type: string; private?: boolean }>;
}

/** Attribute types that are not plain values of the profile, so never a registration field */
const NOT_SCALAR = new Set(['relation', 'component', 'dynamiczone', 'media']);

/** The profile attributes that are Strapi's to set, not the project's */
const NOT_REGISTRATION_FIELDS = new Set(['user', 'publishedAt', 'firstPublishedAt']);

const PROFILE_UID = 'plugin::end-users.profile';

const settingsApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => ({
    getEndUsersSettings: builder.query<SettingsResponse, void>({
      query: () => '/end-users/settings',
      providesTags: [{ type: 'EndUsersSettings', id: 'SETTINGS' }],
    }),
    /**
     * A save the server refused changes nothing, so nothing is invalidated: the page keeps what
     * was typed. A save that went through answers the settings as stored, and that answer
     * replaces the cached one.
     */
    updateEndUsersSettings: builder.mutation<SettingsResponse, EndUsersSettingsPatch>({
      query: (patch) => ({
        url: '/end-users/settings',
        method: 'PUT',
        data: patch,
      }),
      async onQueryStarted(_patch, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(settingsApi.util.updateQueryData('getEndUsersSettings', undefined, () => data));
        } catch {
          // Refused: the caller reads the error from the mutation's result
        }
      },
    }),
    /**
     * The names of the profile fields a sign-up could be asked for, from the Content Manager's
     * content types. The server has the last word: it refuses a name that is not one.
     */
    getEndUsersProfileFields: builder.query<string[], void>({
      query: () => '/content-manager/content-types',
      transformResponse: (response: { data: ProfileSchema[] }) => {
        const profile = response.data.find((type) => type.uid === PROFILE_UID);

        return Object.entries(profile?.attributes ?? {})
          .filter(
            ([name, attribute]) =>
              !NOT_REGISTRATION_FIELDS.has(name) &&
              !NOT_SCALAR.has(attribute.type) &&
              attribute.private !== true
          )
          .map(([name]) => name);
      },
    }),
  }),
});

const {
  useGetEndUsersSettingsQuery: useGetSettingsQuery,
  useUpdateEndUsersSettingsMutation: useUpdateSettingsMutation,
  useGetEndUsersProfileFieldsQuery: useGetProfileFieldsQuery,
} = settingsApi;

export { useGetProfileFieldsQuery, useGetSettingsQuery, useUpdateSettingsMutation };
