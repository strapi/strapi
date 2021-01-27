import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { request } from 'strapi-helper-plugin';
import { get } from 'lodash';

const fetchRoles = async () => {
  const { data } = await request('/admin/roles', { method: 'GET' });

  return data;
};

const useRolesList = (shouldFetchData = true) => {
  const { data, isLoading, error, isError, refetch } = useQuery('roleList', fetchRoles, {
    enabled: shouldFetchData,
  });

  useEffect(() => {
    if (error) {
      const message = get(error, ['response', 'payload', 'message'], 'An error occured');

      if (message !== 'Forbidden') {
        strapi.notification.toggle({
          type: 'warning',
          message,
        });
      }
    }
  }, [error]);

  // In this scenario, event if enabled is false, we can call the refetch
  // and it will act as a "lazy query" call
  const lazyFetch = refetch;

  return { roles: data || [], isLoading, getData: lazyFetch, error, isError };
};

export default useRolesList;
