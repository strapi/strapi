import * as React from 'react';

import { useNotification } from '../../../../../../../../admin/src/features/Notifications';
import { useAPIErrorHandler } from '../../../../../../../../admin/src/hooks/useAPIErrorHandler';
import { useQueryParams } from '../../../../../../../../admin/src/hooks/useQueryParams';
import { useAdminUsers } from '../../../../../../../../admin/src/services/users';
import { useGetAuditLogsQuery } from '../../../../../services/auditLogs';

export const useAuditLogsData = ({
  canReadAuditLogs,
  canReadUsers,
}: {
  canReadAuditLogs: boolean;
  canReadUsers: boolean;
}) => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [{ query }] = useQueryParams();

  const {
    data,
    error,
    isError: isUsersError,
    isLoading: isLoadingUsers,
  } = useAdminUsers(
    {},
    {
      skip: !canReadUsers,
      refetchOnMountOrArgChange: true,
    }
  );

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
    users: data?.users ?? [],
    isLoading: isLoadingUsers || isLoadingAuditLogs,
    hasError: isAuditLogsError || isUsersError,
  };
};
