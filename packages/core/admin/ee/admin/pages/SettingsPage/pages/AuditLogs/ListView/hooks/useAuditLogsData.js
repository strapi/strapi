import { useQuery } from 'react-query';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const useAuditLogsData = ({ canRead }) => {
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
    enabled: canRead,
    keepPreviousData: true,
    retry: false,
    staleTime: 1000 * 20, // 20 seconds
  };

  const {
    data: auditLogs,
    isLoadingAuditLogs,
    status: auditLogsStatus,
  } = useQuery(['auditLogs', search], fetchAuditLogsPage, queryOptions);

  const { data: users, status: userStatus } = useQuery(['auditLogsUsers'], fetchAllUsers, {
    ...queryOptions,
    staleTime: 2 * (1000 * 60), // 2 minutes
  });

  const isLoading = isLoadingAuditLogs;
  const hasError = [userStatus, auditLogsStatus].includes('error');

  useEffect(() => {
    if (hasError) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    }
  }, [hasError, toggleNotification]);

  return { auditLogs, users: users?.data, isLoading, hasError };
};

export default useAuditLogsData;
