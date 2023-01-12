import { useQueries } from 'react-query';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';
import { useLocation } from 'react-router-dom';

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
    staleTime: 1000 * 20,
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  };

  const [auditLogsData, userData] = useQueries([
    { queryKey: ['auditLogs', search], queryFn: fetchAuditLogsPage, ...queryOptions },
    { queryKey: ['auditLogsUsers'], queryFn: fetchAllUsers, ...queryOptions },
  ]);

  const { data: users, isLoading: isLoadingUsers } = userData;
  const { data: auditLogs, isLoadingAuditLogs } = auditLogsData;

  const isLoading = isLoadingAuditLogs || isLoadingUsers;

  return { auditLogs, users: users?.data, isLoading };
};

export default useAuditLogsData;
