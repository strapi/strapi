import { useGetLicenseLimitsQuery } from '../../../../admin/src/services/admin';

/**
 * Whether `admin.auditLogs.enabled: false` turns off audit logs that the license includes.
 * The server then mounts no audit-logs route, so the admin hides the settings link, the settings
 * page and the homepage widget.
 *
 * `window.strapi.features` only carries the license; the config state comes from the authenticated
 * `/admin/license-limit-information`. Until that answers, the license alone decides.
 */
const useIsAuditLogsDisabledByConfig = (): { isLoading: boolean; isDisabledByConfig: boolean } => {
  const isLicensed = window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS);
  const { data, isLoading } = useGetLicenseLimitsQuery(undefined, { skip: isLicensed === false });

  return {
    isLoading,
    isDisabledByConfig: isLicensed === true && data?.data?.auditLogs?.enabled === false,
  };
};

export { useIsAuditLogsDisabledByConfig };
