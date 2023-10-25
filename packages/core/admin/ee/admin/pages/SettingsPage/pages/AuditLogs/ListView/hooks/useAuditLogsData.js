import { useFetchClient, useNotification, useQueryParams } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';

import { useAdminUsers } from '../../../../../../../../admin/src/hooks/useAdminUsers';

const useAuditLogsData = ({ canReadAuditLogs, canReadUsers }) => {
  const { get } = useFetchClient();
  const { search } = useLocation();
  const toggleNotification = useNotification();
  const [{ query }] = useQueryParams();

  const queryOptions = {
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20, // 20 seconds
    onError: (error) => toggleNotification({ type: 'warning', message: error.message }),
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
      const { data } = await get(`/admin/audit-logs`, {
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

export default useAuditLogsData;
