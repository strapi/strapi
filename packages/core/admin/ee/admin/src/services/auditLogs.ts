import { adminApi } from '../../../../admin/src/services/api';
import * as AuditLogs from '../../../../shared/contracts/audit-logs';
import { expandLegacyActionFilters } from '../pages/SettingsPage/pages/AuditLogs/utils/legacyActions';

const auditLogsService = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogs.GetAll.Response, AuditLogs.GetAll.Request['query']>({
      query: (params) => ({
        url: `/admin/audit-logs`,
        config: {
          params: expandLegacyActionFilters(params),
        },
      }),
    }),
    getAuditLog: builder.query<AuditLogs.Get.Response, AuditLogs.Get.Params['id']>({
      query: (id) => `/admin/audit-logs/${id}`,
    }),
    getAuditLogUsers: builder.query<
      AuditLogs.GetUsers.Response,
      AuditLogs.GetUsers.Request['query']
    >({
      query: (params) => ({
        url: `/admin/audit-logs/users`,
        config: {
          params,
        },
      }),
    }),
  }),
  overrideExisting: false,
});

const { useGetAuditLogsQuery, useGetAuditLogQuery, useGetAuditLogUsersQuery } = auditLogsService;

export { useGetAuditLogsQuery, useGetAuditLogQuery, useGetAuditLogUsersQuery };
