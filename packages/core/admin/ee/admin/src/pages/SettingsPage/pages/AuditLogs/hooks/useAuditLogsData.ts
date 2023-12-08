import { useFetchClient, useNotification, useQueryParams } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';

import { useAdminUsers } from '../../../../../../../../admin/src/hooks/useAdminUsers';
import { GetAll } from '../../../../../../../../shared/contracts/audit-logs';

export const useAuditLogsData = ({
  canReadAuditLogs,
  canReadUsers,
}: {
  canReadAuditLogs: boolean;
  canReadUsers: boolean;
}) => {
  const { get } = useFetchClient();
  const { search } = useLocation();
  const toggleNotification = useNotification();
  const [{ query }] = useQueryParams();

  const queryOptions = {
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20, // 20 seconds
    onError: (error: Error) => toggleNotification({ type: 'warning', message: error.message }),
  };

  const {
    users,
    isError: isUsersError,
    isLoading: isLoadingUsers,
  } = useAdminUsers(
    {},
    {
      ...queryOptions,
      enabled: canReadUsers,
      staleTime: 2 * (1000 * 60), // 2 minutes
    }
  );

  const {
    data: auditLogs,
    isLoading: isLoadingAuditLogs,
    isError: isAuditLogsError,
  } = useQuery(
    ['auditLogs', search],
    async () => {
      const { data } = await get<GetAll.Response['data']>(`/admin/audit-logs`, {
        params: query,
      });

      return data;
    },
    {
      ...queryOptions,
      enabled: canReadAuditLogs,
    }
  );

  return {
    auditLogs,
    users,
    isLoading: isLoadingUsers || isLoadingAuditLogs,
    hasError: isAuditLogsError || isUsersError,
  };
};
