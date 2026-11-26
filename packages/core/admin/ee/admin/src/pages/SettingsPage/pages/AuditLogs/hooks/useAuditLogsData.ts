import * as React from 'react';

import { useNotification } from '../../../../../../../../admin/src/features/Notifications';
import { useAPIErrorHandler } from '../../../../../../../../admin/src/hooks/useAPIErrorHandler';
import { GetAll } from '../../../../../../../../shared/contracts/audit-logs';
import { useGetAuditLogsQuery, useGetAuditLogUsersQuery } from '../../../../../services/auditLogs';

/**
 * The authors the user filter lists. The filters the logs are fetched with depend on them, so the
 * logs are fetched by `useAuditLogs`.
 */
export const useAuditLogUsers = ({
  canReadAuditLogs,
  pageSize,
}: {
  canReadAuditLogs: boolean;
  pageSize: number;
}) => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data, error, isError, isLoading } = useGetAuditLogUsersQuery(
    { pageSize },
    {
      skip: !canReadAuditLogs,
      refetchOnMountOrArgChange: true,
    }
  );

  const [usersData, setUsersData] = React.useState<typeof data>();

  React.useEffect(() => {
    if (data) {
      setUsersData(data);
    }
  }, [data]);

  React.useEffect(() => {
    if (error) {
      toggleNotification({ type: 'danger', message: formatAPIError(error) });
    }
  }, [error, toggleNotification, formatAPIError]);

  return {
    users: usersData?.results ?? [],
    usersPagination: usersData?.pagination ?? undefined,
    isLoadingUsers: isLoading,
    // Loading more authors keeps the ones already listed
    isLoading: isLoading && !usersData,
    hasError: isError,
  };
};

export const useAuditLogs = ({
  canReadAuditLogs,
  query,
}: {
  canReadAuditLogs: boolean;
  query: GetAll.Request['query'];
}) => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data, isLoading, isError, error } = useGetAuditLogsQuery(query, {
    refetchOnMountOrArgChange: true,
    skip: !canReadAuditLogs,
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({ type: 'danger', message: formatAPIError(error) });
    }
  }, [error, toggleNotification, formatAPIError]);

  return { auditLogs: data, isLoading, hasError: isError };
};
