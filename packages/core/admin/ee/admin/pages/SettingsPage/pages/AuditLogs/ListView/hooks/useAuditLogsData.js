import { useQuery } from 'react-query';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';
import { useLocation } from 'react-router-dom';

const useAuditLogsData = ({ canReadAuditLogs, canReadUsers }) => {
  const { get } = useFetchClient();
  const { search } = useLocation();
  const toggleNotification = useNotification();

  const fetchAuditLogsPage = async ({ queryKey }) => {
    const search = queryKey[1];
    const { data } = await get(`/admin/audit-logs${search}`);

    return data;
  };

  const fetchAllUsers = async () => {
    const { data } = await get(`/admin/users`);

    return data;
  };

  const queryOptions = {
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20, // 20 seconds
    onError: (error) => toggleNotification({ type: 'warning', message: error.message }),
  };

  const {
    data: auditLogs,
    isLoading,
    isError: isAuditLogsError,
  } = useQuery(['auditLogs', search], fetchAuditLogsPage, {
    ...queryOptions,
    enabled: canReadAuditLogs,
  });

  const { data: users, isError: isUsersError } = useQuery(['auditLogsUsers'], fetchAllUsers, {
    ...queryOptions,
    enabled: canReadUsers,
    staleTime: 2 * (1000 * 60), // 2 minutes
  });

  const hasError = isAuditLogsError || isUsersError;

  return { auditLogs, users: users?.data, isLoading, hasError };
};

export default useAuditLogsData;
