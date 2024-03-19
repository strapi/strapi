import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import pluginId from '../pluginId';
import { getTrad } from '../utils';

export const useFolder = (id, { enabled = true } = {}) => {
  const { toggleNotification } = useNotification();
  const { get } = useFetchClient();
  const { formatMessage } = useIntl();

  const { data, error, isLoading } = useQuery(
    [pluginId, 'folder', id],
    async () => {
      const {
        data: { data },
      } = await get(`/upload/folders/${id}`, {
        params: {
          populate: {
            parent: {
              populate: {
                parent: '*',
              },
            },
          },
        },
      });

      return data;
    },
    {
      retry: false,
      enabled,
      staleTime: 0,
      cacheTime: 0,
      onError() {
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: getTrad('notification.warning.404'),
            defaultMessage: 'Not found',
          }),
        });
      },
    }
  );

  return { data, error, isLoading };
};
