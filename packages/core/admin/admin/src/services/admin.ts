import {
  type TelemetryProperties,
  type Init,
  type Information,
  type GetProjectSettings,
  type UpdateProjectSettings,
  type Plugins,
  type GetLicenseLimitInformation,
  GetDashboardKeyNumbers,
  GetDashboardContentTypeStatistics,
  GetDashboardEEStatistics,
} from '../../../shared/contracts/admin';
import { prefixFileUrlWithBackendUrl } from '../utils/urls';

import { adminApi } from './api';

interface ConfigurationLogo {
  custom?: {
    name?: string;
    url?: string;
  };
  default: string;
}

const admin = adminApi
  .enhanceEndpoints({
    addTagTypes: ['ProjectSettings', 'LicenseLimits', 'Statistics'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      init: builder.query<Init.Response['data'], void>({
        query: () => ({
          url: '/admin/init',
          method: 'GET',
        }),
        transformResponse(res: Init.Response) {
          return res.data;
        },
      }),
      information: builder.query<Information.Response['data'], void>({
        query: () => ({
          url: '/admin/information',
          method: 'GET',
        }),
        transformResponse(res: Information.Response) {
          return res.data;
        },
      }),
      telemetryProperties: builder.query<TelemetryProperties.Response['data'], void>({
        query: () => ({
          url: '/admin/telemetry-properties',
          method: 'GET',
          config: {
            validateStatus: (status) => status < 500,
          },
        }),
        transformResponse(res: TelemetryProperties.Response) {
          return res.data;
        },
      }),
      projectSettings: builder.query<
        { authLogo?: ConfigurationLogo['custom']; menuLogo?: ConfigurationLogo['custom'] },
        void
      >({
        query: () => ({
          url: '/admin/project-settings',
          method: 'GET',
        }),
        providesTags: ['ProjectSettings'],
        transformResponse(data: GetProjectSettings.Response) {
          return {
            authLogo: data.authLogo
              ? {
                  name: data.authLogo.name,
                  url: prefixFileUrlWithBackendUrl(data.authLogo.url),
                }
              : undefined,
            menuLogo: data.menuLogo
              ? {
                  name: data.menuLogo.name,
                  url: prefixFileUrlWithBackendUrl(data.menuLogo.url),
                }
              : undefined,
          };
        },
      }),
      updateProjectSettings: builder.mutation<UpdateProjectSettings.Response, FormData>({
        query: (data) => ({
          url: '/admin/project-settings',
          method: 'POST',
          data,
          config: {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        }),
        invalidatesTags: ['ProjectSettings'],
      }),
      getPlugins: builder.query<Plugins.Response, void>({
        query: () => ({
          url: '/admin/plugins',
          method: 'GET',
        }),
      }),
      getLicenseLimits: builder.query<GetLicenseLimitInformation.Response, void>({
        query: () => ({
          url: '/admin/license-limit-information',
          method: 'GET',
        }),
        providesTags: ['LicenseLimits'],
      }),
      getDashboardKeyNumbers: builder.query<GetDashboardKeyNumbers.Response['data'], void>({
        query: () => ({
          url: '/admin/dashboard-key-numbers',
          method: 'GET',
        }),
        providesTags: ['Statistics'],
      }),
      getDashboardStatistics: builder.query<
        GetDashboardContentTypeStatistics.Response['statistics'],
        GetDashboardContentTypeStatistics.Params['uid']
      >({
        query: (data) => ({
          url: `/admin/dashboard-statistics/${data}`,
          method: 'GET',
          data,
        }),
        providesTags: ['Statistics'],
      }),
      getDashboardEEStatistics: builder.query<
        GetDashboardEEStatistics.Response['statistics'],
        void
      >({
        query: () => ({
          url: `/admin/dashboard-ee-statistics`,
          method: 'GET',
        }),
        providesTags: ['Statistics'],
      }),
    }),
    overrideExisting: false,
  });

const {
  useInitQuery,
  useTelemetryPropertiesQuery,
  useInformationQuery,
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
  useGetPluginsQuery,
  useGetLicenseLimitsQuery,
  useGetDashboardKeyNumbersQuery,
  useGetDashboardStatisticsQuery,
  useGetDashboardEEStatisticsQuery,
} = admin;

export {
  useInitQuery,
  useTelemetryPropertiesQuery,
  useInformationQuery,
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
  useGetPluginsQuery,
  useGetLicenseLimitsQuery,
  useGetDashboardKeyNumbersQuery,
  useGetDashboardStatisticsQuery,
  useGetDashboardEEStatisticsQuery,
};

export type { ConfigurationLogo };
