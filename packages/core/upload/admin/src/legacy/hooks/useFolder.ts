import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from 'react-intl';

import { GetFolder } from '../../../../shared/contracts/folders';
import { pluginId } from '../../pluginId';
import { getTrad } from '../utils';

export const useFolder = (id: number | null | undefined, { enabled = true } = {}) => {
  const { toggleNotification } = useNotification();
  const { get } = useFetchClient();
  const { formatMessage } = useIntl();

  const {
    data,
    error,
    isLoading: isQueryLoading,
  } = useQuery<GetFolder.Response['data'], GetFolder.Response['error']>(
    [pluginId, 'folder', id],
    async () => {
      const {
        data: { data },
      } = await get<GetFolder.Response>(`/upload/folders/${id}`, {
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
  // v4 reports disabled empty queries as loading. Gate that state by `enabled` while preserving
  // v3's loading state when an enabled offline-first query pauses between retries.
  const isLoading = enabled && isQueryLoading;

  return { data, error, isLoading };
};
