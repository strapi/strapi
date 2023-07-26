import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

import pluginId from '../pluginId';
import { getTrad } from '../utils';

export const useFolder = (id, { enabled = true }) => {
  const toggleNotification = useNotification();
  const { get } = useFetchClient();

  const fetchFolder = async () => {
    try {
      const params = {
        populate: {
          parent: {
            populate: {
              parent: '*',
            },
          },
        },
      };
      const {
        data: { data },
      } = await get(`/upload/folders/${id}`, { params });

      return data;
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: {
          id: getTrad('notification.warning.404'),
          defaultMessage: 'Not found',
        },
      });

      throw err;
    }
  };

  const { data, error, isLoading } = useQuery([pluginId, 'folder', id], fetchFolder, {
    retry: false,
    enabled,
    staleTime: 0,
    cacheTime: 0,
  });

  return { data, error, isLoading };
};
