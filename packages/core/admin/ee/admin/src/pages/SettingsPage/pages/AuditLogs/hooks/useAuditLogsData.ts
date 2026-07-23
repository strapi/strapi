import * as React from 'react';

import { useNotification } from '../../../../../../../../admin/src/features/Notifications';
import { useAPIErrorHandler } from '../../../../../../../../admin/src/hooks/useAPIErrorHandler';
import { useQueryParams } from '../../../../../../../../admin/src/hooks/useQueryParams';
import { useGetAuditLogsQuery, useGetAuditLogUsersQuery } from '../../../../../services/auditLogs';

export const useAuditLogsData = ({
  canReadAuditLogs,
  usersPageSize,
}: {
  canReadAuditLogs: boolean;
  usersPageSize: number;
}) => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [{ query }] = useQueryParams();

  const {
    data,
    error,
    isError: isUsersError,
    isLoading: isLoadingUsers,
  } = useGetAuditLogUsersQuery(
    { pageSize: usersPageSize },
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

  const {
    data: auditLogs,
    isLoading: isLoadingAuditLogs,
    isError: isAuditLogsError,
    error: auditLogsError,
  } = useGetAuditLogsQuery(query, {
    refetchOnMountOrArgChange: true,
    skip: !canReadAuditLogs,
  });

  React.useEffect(() => {
    if (auditLogsError) {
      toggleNotification({ type: 'danger', message: formatAPIError(auditLogsError) });
    }
  }, [auditLogsError, toggleNotification, formatAPIError]);

  return {
    auditLogs,
    users: usersData?.results ?? [],
    usersPagination: usersData?.pagination ?? undefined,
    isLoadingUsers,
    isLoading: (isLoadingUsers && !usersData) || isLoadingAuditLogs,
    hasError: isAuditLogsError || isUsersError,
  };
};
